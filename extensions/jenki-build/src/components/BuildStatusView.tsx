import { Detail, ActionPanel, Action, Color, Icon, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchBuildStatus, BuildStatus } from "../api/jenkins";
import { handleFetchError } from "../utils/errors";

interface BuildStatusViewProps {
  jobName: string;
  jobPath: string;
  jobUrl: string;
  buildNumber: number;
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 5);
  const empty = 20 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export function BuildStatusView({
  jobName,
  jobPath,
  jobUrl,
  buildNumber,
}: BuildStatusViewProps) {
  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const buildUrl = `${jobUrl.replace(/\/$/, "")}/${buildNumber}/`;

  async function refresh() {
    try {
      const s = await fetchBuildStatus(buildUrl);
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(handleFetchError(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Poll every 3s while building
  useEffect(() => {
    if (status && !status.building) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [status?.building]);

  // Tick elapsed time every second while building
  useEffect(() => {
    if (!status?.building) return;
    const start = status.timestamp + status.duration;
    const tick = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(tick);
  }, [status?.building, status?.timestamp]);

  function buildMarkdown(): string {
    if (error) return `## Error\n\n${error}`;
    if (!status) return "Loading build status...";

    const resultEmoji = status.building
      ? "🔵 Building"
      : status.result === "SUCCESS"
        ? "✅ Success"
        : status.result === "FAILURE"
          ? "❌ Failed"
          : status.result === "ABORTED"
            ? "⛔ Aborted"
            : status.result === "UNSTABLE"
              ? "⚠️ Unstable"
              : "❓ Unknown";

    const lines: string[] = [
      `# ${jobName} — Build #${buildNumber}`,
      `**${resultEmoji}**`,
      "",
      `| | |`,
      `|---|---|`,
      `| Job | \`${jobPath}\` |`,
    ];

    if (status.building) {
      const totalMs = elapsed + status.duration;
      const pct =
        status.estimatedDuration > 0
          ? Math.min(
              100,
              Math.round((totalMs / status.estimatedDuration) * 100),
            )
          : 0;
      lines.push(`| Elapsed | ${formatDuration(totalMs)} |`);
      if (status.estimatedDuration > 0) {
        lines.push(
          `| Estimated | ~${formatDuration(status.estimatedDuration)} |`,
        );
        lines.push("", `**Progress: ${pct}%**`, `\`${progressBar(pct)}\``);
      }
    } else {
      lines.push(`| Duration | ${formatDuration(status.duration)} |`);
      if (status.result === "SUCCESS") {
        lines.push("", `\`${progressBar(100)}\` 100%`);
      }
    }

    return lines.join("\n");
  }

  const resultColor: Color =
    !status || status.building
      ? Color.Blue
      : status.result === "SUCCESS"
        ? Color.Green
        : status.result === "FAILURE"
          ? Color.Red
          : Color.Orange;

  return (
    <Detail
      navigationTitle={`#${buildNumber} — ${jobName}`}
      markdown={buildMarkdown()}
      metadata={
        status && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={
                  status.building ? "Building" : (status.result ?? "Unknown")
                }
                color={resultColor}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Started"
              text={new Date(status.timestamp).toLocaleTimeString()}
            />
            {!status.building && (
              <Detail.Metadata.Label
                title="Duration"
                text={formatDuration(status.duration)}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Open Build"
              target={buildUrl}
              text={`Build #${buildNumber}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => open(buildUrl)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
        </ActionPanel>
      }
    />
  );
}
