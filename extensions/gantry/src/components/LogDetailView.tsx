import { Detail, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { LaunchJob } from "../lib/types";
import { readLogTail } from "../lib/data/log-reader";

interface LogDetailViewProps {
  job: LaunchJob;
}

export function LogDetailView({ job }: LogDetailViewProps) {
  const logPath = job.logPaths.stdout ?? job.logPaths.stderr;

  const {
    data: logContent,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (path: string | undefined) => {
      if (!path) return null;
      return readLogTail(path, 100);
    },
    [logPath],
    { keepPreviousData: true },
  );

  let markdown: string;
  if (!logPath) {
    markdown = "*No log file configured for this job.*";
  } else if (logContent === null) {
    markdown = `*Could not read log file:*\n\n\`${logPath}\``;
  } else if (logContent === "") {
    markdown = "*Log file is empty.*";
  } else {
    markdown = `## Logs — ${job.label}\n\n\`${logPath}\`\n\n\`\`\`\n${logContent}\n\`\`\``;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Logs — ${job.label}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => revalidate()}
            />
            {logContent && (
              <Action.CopyToClipboard
                title="Copy Logs"
                content={logContent}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
          </ActionPanel.Section>
          {logPath && (
            <ActionPanel.Section>
              <Action.Open
                title="Open Log File"
                target={logPath}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.OpenWith
                title="Open in Terminal (tail -f)"
                path={logPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
