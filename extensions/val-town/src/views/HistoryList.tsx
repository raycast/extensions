import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getValHistory, webUrlFor } from "../lib/api";
import { errorMessage } from "../lib/format";
import type { HistoryCommit } from "../lib/types";

export function HistoryList({ val, branch }: { val: string; branch: string }) {
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string, currentBranch: string) => getValHistory(identifier, { branch: currentBranch }),
    [val, branch],
  );

  const commits = data?.history ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={`History · ${val}`} searchBarPlaceholder="Filter commits">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load history"
          description={errorMessage(error)}
        />
      ) : (
        <>
          <List.EmptyView icon={Icon.Clock} title="No commits" />
          {commits.map((commit, index) => (
            <List.Item
              key={`${commit.id}-${commit.version}-${index}`}
              icon={commit.revert ? Icon.ArrowCounterClockwise : commit.merge ? Icon.TwoArrowsClockwise : Icon.Pencil}
              title={titleFor(commit)}
              subtitle={commit.user?.handle ?? undefined}
              accessories={[{ tag: `v${commit.version}` }, { date: new Date(commit.createdAt) }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open on Val Town" url={webUrlFor(val)} />
                  <Action.CopyToClipboard title="Copy Version" content={String(commit.version)} />
                  <Action.CopyToClipboard title="Copy Commit ID" content={commit.id} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}

function titleFor(commit: HistoryCommit): string {
  if (commit.multiple && commit.multiple.count > 1) {
    return `${commit.multiple.count} files changed`;
  }
  return commit.file?.name ?? `Version ${commit.version}`;
}
