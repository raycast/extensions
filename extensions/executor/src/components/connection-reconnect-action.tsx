import { Action, Icon, Toast, open, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { checkConnectionHealth, execute, listConnections, webUrl } from "../lib/client";
import {
  connectionHandoffCode,
  handoffFromExecution,
  integrationDetailUrl,
  validatedIntegrationUrl,
} from "../lib/connection-actions";
import { safeBrowserUrl } from "../lib/execution";
import { startOAuthReconnect } from "../lib/connection-reconnect";
import type { Connection } from "../lib/types";

export function ConnectionReconnectAction({
  connection,
  onChecked,
}: {
  connection: Connection;
  onChecked?: () => void;
}) {
  const busy = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [waitingForBrowser, setWaitingForBrowser] = useState(false);

  async function browserHandoff(current: Connection) {
    const result = await execute(
      connectionHandoffCode({
        integration: current.integration,
        owner: current.owner,
        template: current.template,
        label: current.name,
      }),
    );
    if (!active.current) return;
    const handoff = handoffFromExecution(result);
    const safeUrl = handoff && validatedIntegrationUrl(handoff.url, webUrl(), connection.integration);
    if (!safeUrl) throw new Error("Executor did not return a valid integration URL for this server.");
    await open(integrationDetailUrl(safeUrl));
    setWaitingForBrowser(true);
    await showToast({
      style: Toast.Style.Success,
      title: "Continue in Executor",
      message: "Reconnect this account there, then return to Raycast to check it.",
    });
  }

  async function verifyReconnect() {
    const health = await checkConnectionHealth(connection);
    const rows = await listConnections({ integration: connection.integration, owner: connection.owner });
    const current = rows.find((item) => item.name === connection.name);
    if (!current) throw new Error("The connection is no longer present in Executor.");
    onChecked?.();
    if (health.status !== "healthy" || current.missingOAuthScopes.length > 0) {
      setWaitingForBrowser(true);
      await showToast({
        style: Toast.Style.Failure,
        title: "Reconnection Not Verified Yet",
        message:
          health.status !== "healthy"
            ? `Executor reports ${health.status}. The connection is not confirmed healthy.`
            : `${current.missingOAuthScopes.length} required scope${current.missingOAuthScopes.length === 1 ? "" : "s"} still missing.`,
      });
      return;
    }
    setWaitingForBrowser(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Connection Is Healthy",
    });
  }

  async function startReconnect() {
    if (busy.current) return;
    busy.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Preparing Reconnection" });
    try {
      if (waitingForBrowser) {
        toast.hide();
        await verifyReconnect();
        return;
      }

      const rows = await listConnections({ integration: connection.integration, owner: connection.owner });
      const current = rows.find(
        (item) =>
          item.name === connection.name &&
          item.owner === connection.owner &&
          item.integration === connection.integration,
      );
      if (!current) throw new Error("The connection is no longer present in Executor.");
      const started = await startOAuthReconnect(current, () => active.current);
      if (!active.current) return;
      if (!started) {
        toast.hide();
        await browserHandoff(current);
        return;
      }

      if (started.status === "redirect") {
        const authorizationUrl = safeBrowserUrl(started.authorizationUrl);
        if (!authorizationUrl) throw new Error("Executor returned an unsafe OAuth authorization URL.");
        setWaitingForBrowser(true);
        await open(authorizationUrl);
        toast.style = Toast.Style.Success;
        toast.title = "Finish Authorization in Browser";
        toast.message = "Return to Raycast afterward to verify the connection.";
        return;
      }

      toast.hide();
      await verifyReconnect();
    } catch (error) {
      toast.hide();
      if (active.current) await showFailureToast(error, { title: "Could Not Reconnect" });
    } finally {
      busy.current = false;
    }
  }

  return (
    <Action
      title={waitingForBrowser ? "Check Reconnection" : "Reconnect"}
      icon={waitingForBrowser ? Icon.MagnifyingGlass : Icon.Link}
      onAction={startReconnect}
    />
  );
}
