import { Action, ActionPanel, Detail, Icon, Keyboard, environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { createBttClient } from "./btt";
import { formatDiagnostics, loadDiagnostics } from "./diagnostics-model";

export function DevelopmentDiagnosticsSection() {
  if (!environment.isDevelopment) return null;
  return (
    <ActionPanel.Section title="Debug">
      <Action.Push title="Show Connection Diagnostics" target={<DiagnosticsDetail />} icon={Icon.Heartbeat} />
    </ActionPanel.Section>
  );
}

function DiagnosticsDetail() {
  const btt = useMemo(createBttClient, []);
  const { isLoading, data, revalidate } = usePromise(loadDiagnostics, [btt], {
    failureToastOptions: { title: "Could not connect to BetterTouchTool" },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? formatDiagnostics(data) : "# BetterTouchTool Diagnostics\n\nConnecting..."}
      actions={
        <ActionPanel>
          <Action
            title="Run Diagnostics Again"
            onAction={revalidate}
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
