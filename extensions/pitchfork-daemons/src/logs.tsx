import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { readLogs } from "./pitchfork";

export default function Logs({ id }: { id: string }) {
  const { data, error, isLoading, revalidate } = useCachedPromise(readLogs, [id], {
    keepPreviousData: true,
    onError: () => {},
  });

  useEffect(() => {
    const timer = setInterval(revalidate, 2000);
    return () => clearInterval(timer);
  }, [revalidate]);

  const text = error ? error.message : data?.trimEnd() || "No logs yet.";
  // A fence longer than any backtick run inside keeps the log verbatim.
  const fence = "`".repeat(Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)));

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Logs · ${id}`}
      markdown={`${fence}\n${text}\n${fence}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Logs" content={data ?? ""} />
          <Action.CopyToClipboard
            title="Copy Follow Command"
            content={`pitchfork logs --tail -- ${id}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
