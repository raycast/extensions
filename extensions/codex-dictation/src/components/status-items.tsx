import { Action, ActionPanel, List } from "@raycast/api";
import { CODEX_APP_URL } from "../codex-paths";
import type { CodexPaths } from "../codex-paths";

export function SkippedLinesItem({ skippedLines }: { skippedLines: number }) {
  return (
    <List.Item
      title={`${skippedLines} history ${skippedLines === 1 ? "line was" : "lines were"} skipped`}
      subtitle="Those entries could not be parsed"
      detail={
        <List.Item.Detail markdown="Some history lines could not be parsed as Codex dictation entries." />
      }
    />
  );
}

export function CodexMissingItem({ paths }: { paths: CodexPaths }) {
  return (
    <List.EmptyView
      title="Codex is not installed or has not been opened yet"
      description={`Codex data was not found at ${paths.codexHome}. Install and open the Codex App. Sign in before using dictation history.`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Install Codex App" url={CODEX_APP_URL} />
        </ActionPanel>
      }
    />
  );
}

export function EmptyHistoryItem({ paths }: { paths: CodexPaths }) {
  return (
    <List.Item
      title="No dictations yet"
      subtitle={paths.historyPath}
      detail={
        <List.Item.Detail
          markdown={`No dictations have been written to \`${paths.historyPath}\` yet.`}
        />
      }
    />
  );
}

export function ErrorItem({
  message,
  paths,
}: {
  message: string;
  paths: CodexPaths;
}) {
  return (
    <List.Item
      title="Could not load dictation history"
      subtitle={message}
      detail={
        <List.Item.Detail
          markdown={`Could not load dictation history from \`${paths.historyPath}\`:\n\n\`\`\`text\n${message}\n\`\`\``}
        />
      }
    />
  );
}
