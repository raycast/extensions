import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { stripVTControlCharacters } from "node:util";
import { getLocalGatewayLogs, runLocalGatewayMaintenance } from "./api";

type Logs = Awaited<ReturnType<typeof getLocalGatewayLogs>>;
type MaintenanceOperation = Parameters<typeof runLocalGatewayMaintenance>[0];

function logMarkdown(line: string) {
  const longest = (line.match(/`+/g) ?? []).reduce(
    (length, sequence) => Math.max(length, sequence.length),
    2,
  );
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${line}\n${fence}`;
}

function errorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  if (detail === "Select Local Gateway on This Mac in extension preferences.")
    return detail;
  const requestId =
    /\(PAIRING_REQUIRED\).*?openclaw devices approve ([A-Za-z0-9_-]+)$/.exec(
      detail,
    )?.[1];
  if (requestId)
    return `Approve the local device with openclaw devices approve ${requestId}, then retry.`;
  return "Check the local Gateway connection, device pairing, and supported operations.";
}

export default function Command() {
  const localMode =
    getPreferenceValues<Preferences>().connectionMode === "local";
  const [logs, setLogs] = useState<Logs>();
  const [loadError, setLoadError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [maintaining, setMaintaining] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(undefined);
    void getLocalGatewayLogs()
      .then(
        (result) => {
          if (active) setLogs(result);
        },
        (error) => {
          if (!active) return;
          setLogs(undefined);
          setLoadError(errorMessage(error));
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  function refresh() {
    setRevision((current) => current + 1);
  }

  async function maintain(operation: MaintenanceOperation) {
    if (running.current) return;
    running.current = true;
    setMaintaining(true);
    const restart = operation === "restart";
    try {
      const completed = await runLocalGatewayMaintenance(
        operation,
        ({ gatewayUrl, agentId }) =>
          confirmAlert({
            title: restart
              ? "Request a Gateway Restart?"
              : "Run Session Cleanup?",
            message: restart
              ? `Target: ${gatewayUrl}. OpenClaw may defer the restart while work is active.`
              : `Apply agent ${agentId}'s session maintenance policy at ${gatewayUrl}. This may archive sessions or permanently remove history under retention and disk limits.`,
            primaryAction: {
              title: restart ? "Request Restart" : "Run Cleanup",
              style: Alert.ActionStyle.Destructive,
            },
          }),
      );
      if (completed) {
        await showToast({
          style: Toast.Style.Success,
          title: restart
            ? "Gateway Restart Requested"
            : "Session Cleanup Completed",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: restart
          ? "Could Not Request a Restart"
          : "Could Not Run Cleanup",
        message: errorMessage(error),
      });
    } finally {
      running.current = false;
      setMaintaining(false);
    }
  }

  function actions(line?: string) {
    return (
      <ActionPanel>
        {line !== undefined && (
          <Action.CopyToClipboard
            title="Copy Log Record"
            content={line}
            concealed
          />
        )}
        <Action
          icon={Icon.ArrowClockwise}
          title="Refresh Logs"
          onAction={refresh}
        />
        <Action
          icon={Icon.Gear}
          title="Open Extension Preferences"
          onAction={openExtensionPreferences}
        />
        {localMode && !maintaining && (
          <ActionPanel.Section title="Local Gateway Maintenance">
            <Action
              icon={Icon.ArrowClockwise}
              title="Request Gateway Restart"
              style={Action.Style.Destructive}
              onAction={() => maintain("restart")}
            />
            <Action
              icon={Icon.Trash}
              title="Run Session Cleanup"
              style={Action.Style.Destructive}
              onAction={() => maintain("cleanup")}
            />
          </ActionPanel.Section>
        )}
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={loading || maintaining}
      isShowingDetail
      actions={actions()}
      searchBarPlaceholder="Search recent Gateway logs…"
    >
      <List.EmptyView
        title={loadError ? "Could Not Read Gateway Logs" : "No Log Records"}
        description={loadError}
        actions={actions()}
      />
      <List.Section
        title={
          logs?.truncated ? "Recent Records (Truncated)" : "Recent Records"
        }
      >
        {logs?.lines
          .slice()
          .reverse()
          .map((raw, index) => {
            const line = stripVTControlCharacters(raw);
            return (
              <List.Item
                key={index}
                title={
                  line.replace(/\s+/g, " ").trim().slice(0, 130) ||
                  "(Empty Record)"
                }
                keywords={[line]}
                detail={<List.Item.Detail markdown={logMarkdown(line)} />}
                actions={actions(line)}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
