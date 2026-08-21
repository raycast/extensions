import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "./api";
import {
  Capabilities,
  getCapabilities,
  getHealthDetailed,
  HealthDetailed,
  HermesApiError,
} from "./hermes-client";

interface StatusState {
  health?: HealthDetailed;
  capabilities?: Capabilities;
  latency?: number;
  error?: string;
  errorStatus?: number;
}

function statusDot(ok: boolean): string {
  return ok ? "🟢" : "🔴";
}

function renderMarkdown(state: StatusState, endpoint: string): string {
  if (state.error) {
    const authHint =
      state.errorStatus === 401 || state.errorStatus === 403
        ? "\n\n**This looks like an auth problem.** Check that the API Token in extension preferences matches `API_SERVER_KEY`."
        : "";
    return `# ${statusDot(false)} Hermes API Server Unreachable

| Property | Value |
|----------|-------|
| Endpoint | \`${endpoint}\` |
| Error | ${state.error} |
${authHint}

## Troubleshooting

1. **Check the server**
   \`\`\`
   hermes status
   \`\`\`
2. **Enable the API server** if it is off:
   \`\`\`
   hermes config set gateway.platforms.api_server.enabled true
   \`\`\`
   and set \`API_SERVER_KEY\` in \`~/.hermes/.env\`, then restart the gateway.
3. **Verify the endpoint** in extension preferences (default \`http://127.0.0.1:8642\`).`;
  }

  const health = state.health;
  if (!health) {
    return "Loading…";
  }

  const readinessChecks = health.readiness?.checks ?? {};
  const checksRows = Object.entries(readinessChecks)
    .map(([name, check]) => {
      const ok = check?.status === "ok";
      return `| ${name.replace(/_/g, " ")} | ${statusDot(ok)} ${check?.status ?? "unknown"} |`;
    })
    .join("\n");

  const platforms = health.platforms ?? {};
  const platformRows = Object.entries(platforms)
    .map(([name, info]) => {
      const connected = info?.state === "connected";
      const errSuffix =
        !connected && info?.error_message
          ? ` — ${String(info.error_message).slice(0, 60)}`
          : "";
      return `| ${name} | ${statusDot(connected)} ${info?.state ?? "unknown"}${errSuffix} |`;
    })
    .join("\n");

  const features = state.capabilities?.features ?? {};
  const enabledFeatures = Object.entries(features)
    .filter(([, v]) => v === true)
    .map(([k]) => `\`${k}\``)
    .join(", ");

  const overallOk = health.status === "ok";
  return `# ${statusDot(overallOk)} Hermes API Server

| Property | Value |
|----------|-------|
| Status | ${statusDot(overallOk)} ${health.status ?? "unknown"} |
| Endpoint | \`${endpoint}\` |
| Version | ${health.version ?? "unknown"} |
| Gateway | ${health.gateway_state ?? "unknown"} |
| Active agents | ${health.active_agents ?? 0} |
${state.latency !== undefined ? `| Latency | ${state.latency}ms |` : ""}

## Readiness
| Check | Status |
|-------|--------|
${checksRows || "| (none reported) | — |"}

## Connected Platforms
| Platform | State |
|----------|-------|
${platformRows || "| (none) | — |"}

${enabledFeatures ? `## API Features\n${enabledFeatures}` : ""}`;
}

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [state, setState] = useState<StatusState>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const health = await getHealthDetailed(config);
      const latency = Date.now() - startTime;
      let capabilities: Capabilities | undefined;
      try {
        capabilities = await getCapabilities(config);
      } catch {
        // Older servers may not expose /v1/capabilities; health alone is fine.
      }
      setState({ health, capabilities, latency });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection failed";
      const errorStatus =
        error instanceof HermesApiError ? error.status : undefined;
      setState({ error: message, errorStatus });
      showToast({
        style: Toast.Style.Failure,
        title: "Hermes unreachable",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={renderMarkdown(state, config.endpoint)}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={{ source: "arrow-clockwise" }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
          <Action.CopyToClipboard
            title="Copy Endpoint"
            content={config.endpoint}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
