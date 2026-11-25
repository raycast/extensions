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
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { stripVTControlCharacters } from "node:util";
import { getLocalGatewayLogs, runLocalGatewayMaintenance } from "./api";

type MaintenanceOperation = Parameters<typeof runLocalGatewayMaintenance>[0];
const localSetup = "Select Local Gateway on This Mac in extension preferences.";

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
  if (detail === localSetup) return detail;
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
  const {
    data: logs,
    error,
    isLoading: loading,
    revalidate: refresh,
  } = usePromise(getLocalGatewayLogs, [], {
    execute: localMode,
    onError: () => undefined,
  });
  const loadError = localMode ? error && errorMessage(error) : localSetup;
  const [maintaining, setMaintaining] = useState(false);
  const running = useRef(false);

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
      await showFailureToast(new Error(errorMessage(error)), {
        title: restart
          ? "Could Not Request a Restart"
          : "Could Not Run Cleanup",
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
        {localMode && (
          <Action
            icon={Icon.ArrowClockwise}
            title={loadError ? "Retry" : "Refresh Logs"}
            onAction={refresh}
          />
        )}
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
      {(!loading || loadError) && (
        <List.EmptyView
          title={loadError ? "Could Not Read Gateway Logs" : "No Log Records"}
          description={loadError}
          actions={actions()}
        />
      )}
      <List.Section
        title={
          logs?.truncated ? "Recent Records (Truncated)" : "Recent Records"
        }
      >
        {!loadError &&
          logs?.lines
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
