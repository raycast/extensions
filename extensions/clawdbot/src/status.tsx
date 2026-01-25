import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";

interface ChannelStatus {
  name: string;
  enabled: boolean;
  state: string;
  detail: string;
}

interface SessionInfo {
  key: string;
  kind: string;
  age: string;
  model: string;
  tokens: string;
}

interface StatusData {
  dashboard: string;
  os: string;
  gateway: string;
  gatewayService: string;
  agents: string;
  sessions: string;
  heartbeat: string;
  channels: ChannelStatus[];
  sessionList: SessionInfo[];
  raw: string;
}

function parseTableRow(line: string): string[] {
  // Parse a table row like: │ Item │ Value │
  return line
    .split("│")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function parseStatus(output: string): StatusData {
  const lines = output.split("\n");

  const data: StatusData = {
    dashboard: "",
    os: "",
    gateway: "",
    gatewayService: "",
    agents: "",
    sessions: "",
    heartbeat: "",
    channels: [],
    sessionList: [],
    raw: output,
  };

  let section = "";
  let prevItem = "";

  for (const line of lines) {
    // Detect section headers
    if (line.includes("Overview")) section = "overview";
    else if (line.includes("Channels") && !line.includes("│"))
      section = "channels";
    else if (line.includes("Sessions") && !line.includes("│"))
      section = "sessions";
    else if (
      line.startsWith("┌") ||
      line.startsWith("├") ||
      line.startsWith("└")
    )
      continue;

    // Parse table rows
    if (line.includes("│")) {
      const cells = parseTableRow(line);

      if (section === "overview" && cells.length >= 2) {
        const item = cells[0] || prevItem;
        const value = cells[1];
        prevItem = cells[0] ? cells[0] : prevItem;

        if (item === "Dashboard") data.dashboard = value;
        else if (item === "OS") data.os = value;
        else if (item === "Gateway") data.gateway = value;
        else if (item === "Gateway service") data.gatewayService = value;
        else if (item === "Agents") data.agents = value;
        else if (item === "Sessions") data.sessions = value;
        else if (item === "Heartbeat") data.heartbeat = value;
      }

      if (section === "channels" && cells.length >= 4) {
        // Skip header row
        if (cells[0] === "Channel") continue;
        data.channels.push({
          name: cells[0],
          enabled: cells[1] === "ON",
          state: cells[2],
          detail: cells[3],
        });
      }

      if (section === "sessions" && cells.length >= 5) {
        // Skip header row
        if (cells[0] === "Key") continue;
        data.sessionList.push({
          key: cells[0],
          kind: cells[1],
          age: cells[2],
          model: cells[3],
          tokens: cells[4],
        });
      }
    }
  }

  return data;
}

function getChannelEmoji(state: string): string {
  if (state === "OK") return "🟢";
  if (state === "WARN") return "🟡";
  return "🔴";
}

export default function Command() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const result = execSync("/opt/homebrew/bin/clawdbot status 2>&1", {
          encoding: "utf-8",
          timeout: 15000,
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:${process.env.PATH}`,
          },
        });
        setStatus(parseStatus(result));
      } catch (err: unknown) {
        const e = err as { message?: string; stdout?: string };
        setError(e.message || "Failed to get status");
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: e.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={error} />
          </ActionPanel>
        }
      />
    );
  }

  let markdown = "Loading...";

  if (status) {
    const gatewayOk = status.gatewayService.includes("running");

    const channelRows = status.channels
      .map(
        (ch) =>
          `| ${getChannelEmoji(ch.state)} ${ch.name} | ${ch.enabled ? "ON" : "OFF"} | ${ch.state} |`,
      )
      .join("\n");

    const sessionRows = status.sessionList
      .map(
        (s) =>
          `| ${s.key.split(":").pop()} | ${s.model} | ${s.age} | ${s.tokens} |`,
      )
      .join("\n");

    markdown = `# ${gatewayOk ? "🟢" : "🔴"} Clawdbot Status

## Gateway
| Property | Value |
|----------|-------|
| Status | ${gatewayOk ? "🟢 Running" : "🔴 Stopped"} |
| Service | ${status.gatewayService} |
| Dashboard | ${status.dashboard} |
| OS | ${status.os} |
| Heartbeat | ${status.heartbeat} |

## Channels
| Channel | Enabled | State |
|---------|---------|-------|
${channelRows || "| No channels | - | - |"}

## Sessions
| Session | Model | Age | Tokens |
|---------|-------|-----|--------|
${sessionRows || "| No sessions | - | - | - |"}

---

<details>
<summary>Raw Output</summary>

\`\`\`
${status.raw}
\`\`\`

</details>
`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Raw Output"
            content={status?.raw || ""}
          />
          <Action
            title="Refresh"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              setIsLoading(true);
              try {
                const result = execSync(
                  "/opt/homebrew/bin/clawdbot status 2>&1",
                  {
                    encoding: "utf-8",
                    timeout: 15000,
                    env: {
                      ...process.env,
                      PATH: `/opt/homebrew/bin:${process.env.PATH}`,
                    },
                  },
                );
                setStatus(parseStatus(result));
              } catch (err) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Refresh failed",
                });
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
