// src/views/logs-detail.tsx
import React from "react";
import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { tasktick, CliError } from "../lib/tasktick";
import type { ExecutionLog } from "../lib/types";

interface Props {
  cliPath: string;
  taskId: string;
  taskName: string;
  format: "text" | "json";
}

export function LogsDetail({ cliPath, taskId, taskName, format }: Props) {
  const [log, setLog] = useState<ExecutionLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tasktick
      .logs(cliPath, taskId)
      .then(setLog)
      .catch((err) =>
        setError(err instanceof CliError ? err.message : String(err)),
      );
  }, [cliPath, taskId]);

  let markdown: string;
  if (error) {
    markdown = `# ${taskName}\n\n\`\`\`\n${error}\n\`\`\``;
  } else if (!log) {
    markdown = `# ${taskName}\n\nLoading…`;
  } else if (format === "json") {
    markdown = `# ${taskName}\n\n\`\`\`json\n${JSON.stringify(log, null, 2)}\n\`\`\``;
  } else {
    const exit = log.exitCode ?? "?";
    // The CLI's ExecutionLogDTO currently emits an empty `lines` array
    // (per-line timestamps aren't tracked in the SwiftData schema yet —
    // see Sources/CLI/Output/TaskDTO.swift). The actual content lives in
    // `stdout` / `stderr`. Prefer those; fall back to `lines` for forward
    // compatibility if a future CLI starts populating it.
    let body: string;
    if (log.lines && log.lines.length > 0) {
      body = log.lines
        .map(
          (l) =>
            `[${l.ts.slice(11, 19)}] ${l.stream === "stderr" ? "⚠ " : "  "}${l.text}`,
        )
        .join("\n");
    } else {
      const parts: string[] = [];
      if (log.stdout) parts.push(log.stdout.replace(/\n+$/, ""));
      if (log.stderr) {
        const tagged = log.stderr
          .replace(/\n+$/, "")
          .split("\n")
          .map((l) => `⚠ ${l}`)
          .join("\n");
        parts.push(tagged);
      }
      body = parts.join("\n");
    }
    markdown = `# ${taskName}\n\nExit ${exit}\n\n\`\`\`\n${body || "(no output)"}\n\`\`\``;
  }

  return (
    <Detail
      isLoading={!log && !error}
      markdown={markdown}
      actions={
        <ActionPanel>
          {log && (
            <Action.CopyToClipboard
              title="Copy Output"
              content={
                log.lines.length > 0
                  ? log.lines.map((l) => l.text).join("\n")
                  : [log.stdout, log.stderr].filter(Boolean).join("\n")
              }
            />
          )}
          <Action.OpenInBrowser
            title="Reveal Task in TaskTick"
            url={`tasktick://reveal?id=${taskId}`}
            icon={Icon.Window}
          />
        </ActionPanel>
      }
    />
  );
}
