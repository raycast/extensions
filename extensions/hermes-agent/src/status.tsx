import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPreferences } from "./api";

interface GatewayStatus {
  healthy: boolean;
  endpoint: string;
  modelName: string;
  latency?: number;
  error?: string;
  version?: string;
  sessions?: number;
}

function endpointBase(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

async function checkGatewayStatus(): Promise<GatewayStatus> {
  const prefs = getPreferences();
  const startTime = Date.now();
  const base = endpointBase(prefs.endpoint);
  const headers: Record<string, string> = {};
  if (prefs.token) {
    headers.Authorization = `Bearer ${prefs.token}`;
  }

  const status: GatewayStatus = {
    healthy: false,
    endpoint: prefs.endpoint,
    modelName: (prefs.modelName || "").trim() || "hermes-agent",
  };

  try {
    // OpenAI-compatible liveness: /v1/models is the protocol surface Ask/Chat use.
    const modelsResponse = await fetch(`${base}/v1/models`, {
      method: "GET",
      headers,
    });

    status.latency = Date.now() - startTime;

    if (modelsResponse.ok) {
      status.healthy = true;
      try {
        const payload = (await modelsResponse.json()) as {
          data?: { id?: string }[];
        };
        const ids = (payload.data || [])
          .map((model) => model.id)
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          );
        if (!(prefs.modelName || "").trim()) {
          status.modelName = ids.includes("hermes-agent")
            ? "hermes-agent"
            : ids[0] || status.modelName;
        }
      } catch {
        // Listing body is optional for the health bit.
      }

      // Optional Hermes extras. Bound the wait so a hanging /health cannot
      // block Status after /v1/models already proved the API is up.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      try {
        const healthResponse = await fetch(`${base}/health`, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        if (healthResponse.ok) {
          const data = (await healthResponse.json()) as {
            version?: string;
            sessions?: number;
          };
          status.version = data.version;
          status.sessions = data.sessions;
        }
      } catch {
        // /health is not part of the OpenAI protocol.
      } finally {
        clearTimeout(timer);
      }

      return status;
    }

    status.error = `HTTP ${modelsResponse.status}`;
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

    markdown = `# ${statusEmoji} Hermes API Server Status

## Connection
| Property | Value |
|----------|-------|
| Status | ${statusEmoji} ${statusText} |
| Endpoint | \`${status.endpoint}\` |
| Agent ID | \`${status.modelName}\` |
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

1. **Check if Hermes API server is running**
   \`\`\`
   hermes status
   \`\`\`

2. **Start the API server if needed**
   - Set \`API_SERVER_ENABLED=true\`
   - Set \`API_SERVER_KEY=your-token\`

3. **Verify the endpoint URL** matches your Hermes configuration (default: \`http://127.0.0.1:8642\`)

4. **Check the API token** in extension preferences matches your \`API_SERVER_KEY\` environment variable

5. **OpenAI-compatible proxies** should implement \`GET /v1/models\` with the same bearer used for chat. \`/health\` is optional.
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
