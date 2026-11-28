import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getRelations } from "../../lib/sprint-api";
import { CommitInfo, ItemRef, LinkedPullRequest, SprintItem } from "../../lib/sprint-types";
import { ErrorView } from "./ErrorView";
import { SprintListItem } from "./SprintListItem";

const prColor = (status: string) =>
  status === "active" ? Color.Green : status === "completed" ? Color.Purple : Color.SecondaryText;
const day = (d?: string) => (d ? new Date(d).toLocaleDateString() : undefined);

/** Related work items (parent, children, related…), pull requests and commits of a work item. */
export function RelatedView({ item, onChange }: { item: ItemRef; onChange?: () => void }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(getRelations, [item.id]);
  const done = () => {
    revalidate();
    onChange?.();
  };

  const groups = new Map<string, SprintItem[]>();
  for (const r of data?.items ?? []) groups.set(r.link, [...(groups.get(r.link) ?? []), r.item]);

  const empty = !error && !isLoading && !data?.items.length && !data?.pullRequests.length && !data?.commits.length;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`#${item.id} · Related`}
      searchBarPlaceholder="Filter related items, pull requests and commits…"
    >
      {error ? <ErrorView error={error} retry={revalidate} /> : null}
      {empty ? <List.EmptyView title="Nothing linked to this work item" icon={Icon.Link} /> : null}
      {[...groups.entries()].map(([link, items]) => (
        <List.Section key={link} title={link} subtitle={String(items.length)}>
          {items.map((i) => (
            <SprintListItem key={`${link}-${i.id}`} item={i} onDone={done} />
          ))}
        </List.Section>
      ))}
      {(data?.pullRequests.length ?? 0) > 0 && (
        <List.Section title="Pull Requests" subtitle={String(data?.pullRequests.length)}>
          {data?.pullRequests.map((pr) => <PullRequestRow key={pr.id} pr={pr} />)}
        </List.Section>
      )}
      {(data?.commits.length ?? 0) > 0 && (
        <List.Section title="Commits" subtitle={String(data?.commits.length)}>
          {data?.commits.map((c) => <CommitRow key={c.sha} commit={c} />)}
        </List.Section>
      )}
    </List>
  );
}

function PullRequestRow({ pr }: { pr: LinkedPullRequest }) {
  return (
    <List.Item
      title={`PR ${pr.id}  ${pr.title}`}
      icon={{ source: Icon.Switch, tintColor: prColor(pr.status) }}
      accessories={[
        { tag: { value: pr.status, color: prColor(pr.status) } },
        ...(pr.sourceBranch
          ? [
              {
                tag: { value: pr.sourceBranch, color: Color.Blue },
                tooltip: `${pr.sourceBranch}${pr.targetBranch ? ` → ${pr.targetBranch}` : ""}`,
              },
            ]
          : []),
        ...(pr.repository ? [{ icon: Icon.Folder, text: pr.repository }] : []),
        ...(pr.author ? [{ icon: Icon.Person, text: pr.author }] : []),
        ...(day(pr.date) ? [{ text: day(pr.date) as string }] : []),
      ]}
      actions={
        <ActionPanel>
          {pr.url && <Action.OpenInBrowser title="Open Pull Request" url={pr.url} />}
          {pr.url && <Action.CopyToClipboard title="Copy Link" content={pr.url} />}
        </ActionPanel>
      }
    />
  );
}

function CommitRow({ commit }: { commit: CommitInfo }) {
  return (
    <List.Item
      title={`${commit.sha.slice(0, 7)}  ${commit.message}`}
      icon={Icon.Code}
      accessories={[
        ...(commit.branch ? [{ tag: { value: commit.branch, color: Color.Blue }, tooltip: "Pushed to" }] : []),
        ...(commit.author ? [{ icon: Icon.Person, text: commit.author }] : []),
        ...(day(commit.date) ? [{ text: day(commit.date) as string }] : []),
      ]}
      actions={
        <ActionPanel>
          {commit.url && <Action.OpenInBrowser title="Open Commit" url={commit.url} />}
          <Action.CopyToClipboard title="Copy Commit Hash" content={commit.sha} />
        </ActionPanel>
      }
    />
  );
}
