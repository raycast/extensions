import type { BttInfo, Transport } from "bettertouchtool";

export interface DiagnosticsClient {
  info(): Promise<BttInfo | null>;
  transport(): Promise<Pick<Transport, "kind" | "describe">>;
}

export interface DiagnosticsData {
  info: BttInfo | null;
  transportKind: Transport["kind"];
  transportDescription: string;
}

export async function loadDiagnostics(btt: DiagnosticsClient): Promise<DiagnosticsData> {
  const info = await btt.info();
  const transport = await btt.transport();
  return { info, transportKind: transport.kind, transportDescription: transport.describe() };
}

export function formatDiagnostics({ info, transportKind, transportDescription }: DiagnosticsData): string {
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
