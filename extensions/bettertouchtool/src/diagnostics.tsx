import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type Btt } from "bettertouchtool";
import { useMemo } from "react";
import { createBttClient } from "./btt";

export default function Command() {
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
          <Action title="Run Diagnostics Again" onAction={revalidate} icon={Icon.RotateClockwise} />
        </ActionPanel>
      }
    />
  );
}

async function loadDiagnostics(btt: Btt) {
  const info = await btt.info();
  const transport = await btt.transport();
  return { info, transportKind: transport.kind, transportDescription: transport.describe() };
}

function formatDiagnostics({ info, transportKind, transportDescription }: Awaited<ReturnType<typeof loadDiagnostics>>) {
  return [
    "# BetterTouchTool Diagnostics",
    "## Connection",
    `- Transport: **${transportKind}**`,
    `- Endpoint: \`${transportDescription}\``,
    "## BetterTouchTool",
    info
      ? [
          `- Version: **${info.version}** (${info.build})`,
          `- macOS: ${info.macOS ?? "Unknown"}`,
          `- Socket server: ${info.socketServerEnabled ? "Enabled" : "Disabled"}`,
          `- Available scripting functions: ${info.routes.length}`,
          `- JSON POST support: ${info.http?.jsonBody ? "Yes" : "No"}`,
          `- Secret header support: ${info.http?.secretHeader ? "Yes" : "No"}`,
        ].join("\n")
      : "BTT responded, but capability information requires BetterTouchTool 6.735 or newer.",
  ].join("\n\n");
}
