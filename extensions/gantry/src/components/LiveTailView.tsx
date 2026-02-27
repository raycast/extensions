import { useState, useEffect, useRef } from "react";
import { Detail, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import type { LaunchJob } from "../lib/types";
import { readLogTail } from "../lib/data/log-reader";
import { exec } from "../lib/utils/exec";

interface LiveTailViewProps {
  job: LaunchJob;
}

const POLL_INTERVAL_MS = 2000;

export function LiveTailView({ job }: LiveTailViewProps) {
  const logPath = job.logPaths.stdout ?? job.logPaths.stderr;
  const [logContent, setLogContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!logPath) {
      setIsLoading(false);
      return;
    }

    async function poll() {
      const content = await readLogTail(logPath!, 100);
      setLogContent(content);
      setIsLoading(false);
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [logPath]);

  let markdown: string;
  if (!logPath) {
    markdown = "*No log file configured for this job.*";
  } else if (logContent === null) {
    markdown = `*Could not read log file:*\n\n\`${logPath}\``;
  } else if (logContent === "") {
    markdown = "*Log file is empty.*";
  } else {
    markdown = `## Live Tail — ${job.label}\n\n*Refreshing every ${POLL_INTERVAL_MS / 1000}s*\n\n\`\`\`\n${logContent}\n\`\`\``;
  }

  async function openInTerminal() {
    if (!logPath) return;
    await exec("open", ["-a", "Terminal.app", logPath]);
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Live Tail — ${job.label}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {logContent && (
            <Action.CopyToClipboard
              title="Copy Logs"
              content={logContent}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {logPath && (
            <>
              <Action
                title="Open in Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={openInTerminal}
              />
              <Action.Open
                title="Open Log File"
                target={logPath}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
