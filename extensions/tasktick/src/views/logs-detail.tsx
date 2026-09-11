import React, { useMemo } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { tasktick, CliError } from "../lib/tasktick";
import type { ExecutionLog } from "../lib/types";

interface Props {
  cliPath: string;
  taskId: string;
  taskName: string;
  format: "text" | "json";
}

function formatLogMarkdown(
  taskName: string,
  log: ExecutionLog,
  format: "text" | "json",
): string {
  if (format === "json") {
    return `# ${taskName}\n\n\`\`\`json\n${JSON.stringify(log, null, 2)}\n\`\`\``;
  }

  const exit = log.exitCode ?? "?";
  let body: string;
  if (log.lines?.length) {
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
      parts.push(
        log.stderr
          .replace(/\n+$/, "")
          .split("\n")
          .map((l) => `⚠ ${l}`)
          .join("\n"),
      );
    }
    body = parts.join("\n");
  }
  return `# ${taskName}\n\nExit ${exit}\n\n\`\`\`\n${body || "(no output)"}\n\`\`\``;
}

export function LogsDetail({ cliPath, taskId, taskName, format }: Props) {
  const {
    data: log,
    error,
    isLoading,
  } = useCachedPromise(
    (path: string, id: string) => tasktick.logs(path, id),
    [cliPath, taskId],
    { failureToastOptions: { title: "Failed to load logs" } },
  );

  const markdown = useMemo(() => {
    if (error) {
      const msg = error instanceof CliError ? error.message : String(error);
      return `# ${taskName}\n\n\`\`\`\n${msg}\n\`\`\``;
    }
    if (!log) return `# ${taskName}\n\nLoading…`;
    return formatLogMarkdown(taskName, log, format);
  }, [error, log, taskName, format]);

  const copyContent = useMemo(() => {
    if (!log) return undefined;
    if (log.lines.length > 0) return log.lines.map((l) => l.text).join("\n");
    return [log.stdout, log.stderr].filter(Boolean).join("\n");
  }, [log]);

  return (
    <Detail
      isLoading={isLoading && log === undefined}
      markdown={markdown}
      actions={
        <ActionPanel>
          {copyContent && (
            <Action.CopyToClipboard title="Copy Output" content={copyContent} />
          )}
          <Action
            title="Reveal Task in Tasktick"
            icon={Icon.Window}
            onAction={async () => {
              try {
                await tasktick.reveal(cliPath, taskId);
              } catch (err) {
                const msg = err instanceof CliError ? err.message : String(err);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Reveal failed",
                  message: msg,
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
