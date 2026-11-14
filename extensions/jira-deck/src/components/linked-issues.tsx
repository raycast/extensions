import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { userIcon } from "../lib/icons";
import { Issue } from "../lib/issue";
import { priorityIcon, priorityLabel } from "../lib/priority";
import { getIssuesByKey, sourceKey } from "../lib/source";
import { byRelation, IssueDetail, STATUS_COLORS } from "./issue-detail";
import { ExtensionActions } from "./extension-actions";

/** Opens an issue's linked work items, from any list that shows issues. */
export function ShowLinkedIssuesAction({ issue }: { issue: Issue }) {
  if (!issue.links) return null;
  return (
    <Action.Push
      title="Show Linked Work Items"
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      target={<LinkedIssues issue={issue} />}
    />
  );
}

/** An issue's linked work items, a section per relation, each with its own details. */
export function LinkedIssues({ issue }: { issue: Issue }) {
  const links = issue.links ?? [];
  const keys = [...new Set(links.map((link) => link.key))];
  const {
    data: linked,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (wanted: string, cacheKey: string) => {
      void cacheKey;
      return getIssuesByKey(wanted.split(","));
    },
    [keys.join(","), sourceKey()],
    { failureToastOptions: { title: "Couldn't load linked work items" } },
  );
  const byKey = new Map((linked ?? []).map((entry) => [entry.key, entry]));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${issue.key} · Linked Work Items`}
      searchBarPlaceholder={`Search ${issue.key}'s linked work items`}
    >
      {byRelation(links).map(([relation, related]) => (
        <List.Section key={relation} title={relation} subtitle={String(related.length)}>
          {related.map((link) => {
            const entry = byKey.get(link.key);
            return (
              <List.Item
                key={`${relation}:${link.key}`}
                id={`${relation}:${link.key}`}
                icon={{
                  value: priorityIcon(entry?.priority),
                  tooltip: `Priority: ${priorityLabel(entry?.priority)}`,
                }}
                title={{ value: link.summary, tooltip: link.summary }}
                keywords={[link.key]}
                accessories={[
                  {
                    tag: {
                      value: entry?.status.name ?? link.status,
                      color: entry ? STATUS_COLORS[entry.status.category] : undefined,
                    },
                  },
                  {
                    icon: userIcon(entry?.assignee),
                    tooltip: entry?.assignee ? `Assignee: ${entry.assignee.displayName}` : "Unassigned",
                  },
                ]}
                detail={
                  entry ? (
                    <IssueDetail issue={entry} />
                  ) : (
                    <List.Item.Detail
                      markdown={isLoading ? "" : `Your Jira account can't see ${link.key}. Open it in Jira to check.`}
                    />
                  )
                }
                actions={
                  <ActionPanel title={link.key}>
                    <Action.OpenInBrowser
                      title="Open in Jira"
                      url={link.url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                    <Action.CopyToClipboard
                      title="Copy Key"
                      content={link.key}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={link.url}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                    {entry && <ShowLinkedIssuesAction issue={entry} />}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                    <ExtensionActions />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
