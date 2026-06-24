import { Action, ActionPanel, Color, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { compareCapabilities } from "./api/capabilities";
import { CORE_MCP_TOOLS, OPTIONAL_MCP_TOOLS, WorkspacesResultSchema, parseToolResultData } from "./api/contracts";
import { createTanaMcpClient } from "./api/TanaAPIClient";
import { isTanaClientError } from "./api/errors";

type Preferences = { workspaceApiToken: string; workspaceId: string };

const EXTENSION_BUILD = "local-mcp-2026.06.22";

type Diagnostics = {
  health: "ok" | "degraded";
  nodeSpaceReady: boolean;
  tools: string[];
  workspaceCount: number;
  protocolVersion?: string;
  serverName?: string;
  serverVersion?: string;
};

const runDiagnostics = async (): Promise<Diagnostics> => {
  const preferences = getPreferenceValues<Preferences>();
  const client = createTanaMcpClient({
    token: preferences.workspaceApiToken,
    workspaceId: preferences.workspaceId,
  });
  const health = await client.health();
  const initialized = await client.initialize();
  const [tools, workspaceResult] = await Promise.all([client.listTools(), client.callTool("list_workspaces", {})]);
  return {
    health: health.status,
    nodeSpaceReady: health.nodeSpaceReady,
    tools: tools.map(({ name }) => name).sort(),
    workspaceCount: parseToolResultData(workspaceResult, WorkspacesResultSchema).length,
    protocolVersion: typeof initialized.protocolVersion === "string" ? initialized.protocolVersion : undefined,
    serverName:
      typeof initialized.serverInfo === "object" && initialized.serverInfo !== null && "name" in initialized.serverInfo
        ? String(initialized.serverInfo.name)
        : undefined,
    serverVersion:
      typeof initialized.serverInfo === "object" &&
      initialized.serverInfo !== null &&
      "version" in initialized.serverInfo
        ? String(initialized.serverInfo.version)
        : undefined,
  };
};

const errorMarkdown = (error: unknown) => {
  if (!isTanaClientError(error))
    return `# Diagnostics failed\n\n${error instanceof Error ? error.message : "Unknown error"}`;
  const action = {
    "not-running": "Start Tana Desktop and keep the target workspace loaded.",
    auth: "Create a fresh Personal Token in Tana Desktop and update this extension's preferences.",
    timeout: "Confirm Tana is responsive, then retry.",
    protocol: "Update Tana Desktop and retry. The local protocol response was not compatible.",
    tool: "The Local API rejected a diagnostic tool call. Open Tana and verify the workspace is loaded.",
  }[error.kind];
  return `# Diagnostics failed\n\n**Category:** ${error.kind}\n\n${error.message}\n\n## Next step\n\n${action}`;
};

export default function Command() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics>();
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setDiagnostics(undefined);
    setError(undefined);
    runDiagnostics().then(
      (result) => active && setDiagnostics(result),
      (reason) => active && setError(reason),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const coreCapabilities = diagnostics ? compareCapabilities(diagnostics.tools, CORE_MCP_TOOLS) : undefined;
  const optionalMcp = diagnostics ? compareCapabilities(diagnostics.tools, OPTIONAL_MCP_TOOLS) : undefined;
  const markdown = diagnostics
    ? [
        "# Tana Local API Diagnostics",
        "",
        `- Health: **${diagnostics.health}**`,
        `- Node space ready: **${diagnostics.nodeSpaceReady ? "yes" : "no"}**`,
        `- Workspaces: **${diagnostics.workspaceCount}**`,
        `- Extension build: **${EXTENSION_BUILD}**`,
        `- MCP protocol: **${diagnostics.protocolVersion || "not reported"}**`,
        `- Tana service: **${[diagnostics.serverName, diagnostics.serverVersion].filter(Boolean).join(" ") || "not reported"}**`,
        `- Available tools: **${diagnostics.tools.length}**`,
        `- Missing core tools: **${coreCapabilities?.missing.length ? coreCapabilities.missing.join(", ") : "none"}**`,
        `- REST fallback tools: **${optionalMcp?.missing.length ? optionalMcp.missing.join(", ") : "none required"}**`,
        "",
        "## Available tools",
        "",
        diagnostics.tools.map((name) => `- \`${name}\``).join("\n"),
        "",
        "> Diagnostics never includes your token or Tana content.",
      ].join("\n")
    : error
      ? errorMarkdown(error)
      : "# Checking Tana Local API…";

  return (
    <Detail
      isLoading={!diagnostics && !error}
      markdown={markdown}
      metadata={
        diagnostics ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text={{ value: diagnostics.health, color: diagnostics.health === "ok" ? Color.Green : Color.Orange }}
              icon={diagnostics.health === "ok" ? Icon.CheckCircle : Icon.Warning}
            />
            <Detail.Metadata.Label title="Endpoint" text="localhost:8262" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Retry Diagnostics"
            icon={Icon.ArrowClockwise}
            onAction={() => setAttempt((value) => value + 1)}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
