import { Action, ActionPanel, Detail, environment, Icon, open, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWindscribe, findWindscribeApp, type Status, WindscribeError } from "./windscribe.ts";

const windscribe = createWindscribe(environment.supportPath);
const downloadUrl = "https://windscribe.com/download";
const stateTitles: Record<Status["state"], string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  connecting: "Connecting",
  disconnecting: "Disconnecting",
  "signed-out": "Signed Out",
  "signing-in": "Signing In",
  failed: "Connection Error",
};

type View = { status: Status } | { error: string; missing: boolean };

async function openWindscribe() {
  try {
    await open(await findWindscribeApp());
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Windscribe",
      message: error instanceof WindscribeError ? error.message : "Try opening Windscribe from Applications.",
    });
  }
}

export default function Command() {
  const [view, setView] = useState<View>();
  const [isLoading, setIsLoading] = useState(true);
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setIsLoading(true);
    setView(undefined);
    try {
      setView({ status: await windscribe.status() });
    } catch (error) {
      setView({
        error: error instanceof WindscribeError ? error.message : "Open Windscribe to check the VPN and try again.",
        missing: error instanceof WindscribeError && error.code === "missing",
      });
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const status = view && "status" in view ? view.status : undefined;
  const failure = view && "error" in view ? view : undefined;
  const title = status ? stateTitles[status.state] : failure ? "Status Unavailable" : "Checking Windscribe";
  const detail = status?.detail ?? failure?.error;

  return (
    <Detail
      navigationTitle="Windscribe Status"
      isLoading={isLoading}
      markdown={`# ${title}`}
      metadata={
        status?.location || status?.protocol || detail ? (
          <Detail.Metadata>
            {status?.location && <Detail.Metadata.Label title="Location" text={status.location} />}
            {status?.protocol && <Detail.Metadata.Label title="Protocol" text={status.protocol} />}
            {detail && <Detail.Metadata.Label title="Details" text={detail} />}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {!isLoading && <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={refresh} />}
          {failure?.missing ? (
            <Action.OpenInBrowser title="Download Windscribe" url={downloadUrl} />
          ) : (
            <Action title="Open Windscribe" icon={Icon.AppWindow} onAction={openWindscribe} />
          )}
        </ActionPanel>
      }
    />
  );
}
