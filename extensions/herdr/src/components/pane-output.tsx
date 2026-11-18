import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { readPane } from "../lib/herdr";
import { markdownCode } from "../lib/parsers";
import { getOutputLines, getRefreshIntervalMs } from "../lib/preferences";
import { ErrorView, shortcuts } from "../lib/ui";

export function PaneOutput({ target, title, isAgent = false }: { target: string; title: string; isAgent?: boolean }) {
  const lines = getOutputLines();
  const result = useCachedPromise(readPane, [target, lines, isAgent], { keepPreviousData: true });

  useEffect(() => {
    const timer = setInterval(() => void result.revalidate(), getRefreshIntervalMs());
    return () => clearInterval(timer);
  }, [result.revalidate]);

  if (result.error && !result.data) return <ErrorView error={result.error} onRetry={result.revalidate} />;
  const output = result.data?.replace(/\s+$/, "") || "No terminal output yet.";

  return (
    <Detail
      navigationTitle={title}
      isLoading={result.isLoading}
      markdown={`# ${title}\n\n${markdownCode(output)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Target" text={target} />
          <Detail.Metadata.Label title="Source" text={`Recent unwrapped · ${lines} lines`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh Output"
            icon={Icon.ArrowClockwise}
            shortcut={shortcuts.refresh}
            onAction={result.revalidate}
          />
          <Action.CopyToClipboard title="Copy Output" content={output} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
