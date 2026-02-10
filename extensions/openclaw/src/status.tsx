import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPreferences } from "./api";

interface GatewayStatus {
  healthy: boolean;
  endpoint: string;
  agentId: string;
  latency?: number;
  error?: string;
  version?: string;
  sessions?: number;
}

async function checkGatewayStatus(): Promise<GatewayStatus> {
  const prefs = getPreferences();
  const startTime = Date.now();

  const status: GatewayStatus = {
    healthy: false,
    endpoint: prefs.endpoint,
    agentId: prefs.agentId || "main",
  };

  try {
    // Try the health endpoint first
    const healthResponse = await fetch(`${prefs.endpoint}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${prefs.token}`,
      },
    });

    if (healthResponse.ok) {
      status.healthy = true;
      status.latency = Date.now() - startTime;
      try {
        const data = (await healthResponse.json()) as {
          version?: string;
          sessions?: number;
        };
        status.version = data.version;
        status.sessions = data.sessions;
      } catch {
        // Health endpoint may not return JSON
      }
      return status;
    }
  } catch {
    // Health endpoint not available, try models endpoint
  }

  try {
    // Fallback: try the models endpoint
    const modelsResponse = await fetch(`${prefs.endpoint}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${prefs.token}`,
      },
    });

    status.latency = Date.now() - startTime;

    if (modelsResponse.ok) {
      status.healthy = true;
      return status;
    } else {
      status.error = `HTTP ${modelsResponse.status}`;
    }
  } catch (error) {
    status.latency = Date.now() - startTime;
    status.error = error instanceof Error ? error.message : "Connection failed";
  }

  return status;
}

export default function Command() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      const result = await checkGatewayStatus();
      setStatus(result);
      if (!result.healthy) {
        showToast({
          style: Toast.Style.Failure,
          title: "Gateway Unreachable",
          message: result.error,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  let markdown = "Loading...";

  if (status) {
    const statusEmoji = status.healthy ? "🟢" : "🔴";
    const statusText = status.healthy ? "Connected" : "Unreachable";

    markdown = `# ${statusEmoji} Gateway Status

## Connection
| Property | Value |
|----------|-------|
| Status | ${statusEmoji} ${statusText} |
| Endpoint | \`${status.endpoint}\` |
| Agent ID | \`${status.agentId}\` |
${status.latency ? `| Latency | ${status.latency}ms |` : ""}
${status.version ? `| Version | ${status.version} |` : ""}
${status.sessions !== undefined ? `| Sessions | ${status.sessions} |` : ""}
${status.error ? `| Error | ${status.error} |` : ""}

## Configuration
The gateway endpoint and credentials are configured in the extension preferences.

${
  !status.healthy
    ? `
## Troubleshooting

1. **Check if OpenClaw gateway is running**
   \`\`\`
   openclaw gateway status
   \`\`\`

2. **Start the gateway if needed**
   \`\`\`
   openclaw gateway start
   \`\`\`

3. **Verify the endpoint URL** matches your gateway configuration

4. **Check the API token** in extension preferences matches \`~/.openclaw/openclaw.json\`
`
    : ""
}
`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={{ source: "arrow-clockwise" }}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
          {status && (
            <>
              <Action.CopyToClipboard
                title="Copy Endpoint"
                content={status.endpoint}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open Gateway in Browser"
                url={status.endpoint}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
