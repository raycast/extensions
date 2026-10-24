import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { DEFAULT_LOG_LINES } from "../lib/constants";
import { runContainer } from "../lib/container";
import { followLogsInTerminal } from "../lib/terminal";
import { ErrorView } from "./ErrorView";

async function fetchLogs(id: string, lines: number, signal?: AbortSignal): Promise<string> {
  const { stdout, stderr } = await runContainer(["logs", "-n", String(lines), id], { signal });
  return stdout.trim() || stderr.trim();
}

export function ContainerLogs({ id }: { id: string }) {
  const [lines, setLines] = useState(DEFAULT_LOG_LINES);
  const abortable = useRef<AbortController | undefined>(undefined);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (containerId: string, count: number) => fetchLogs(containerId, count, abortable.current?.signal),
    [id, lines],
    { abortable, keepPreviousData: true },
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const body = data && data.length > 0 ? `\`\`\`\n${data}\n\`\`\`` : "_No logs yet._";

  return (
    <Detail
      navigationTitle={`Logs — ${id}`}
      isLoading={isLoading}
      markdown={`# Logs — ${id}\n\n${body}`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action
            title="Load More Lines"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() => setLines((count) => count + DEFAULT_LOG_LINES)}
          />
          <Action title="Follow in Terminal" icon={Icon.Terminal} onAction={() => followLogsInTerminal(id)} />
          {data ? <Action.CopyToClipboard title="Copy Logs" content={data} /> : null}
        </ActionPanel>
      }
    />
  );
}
