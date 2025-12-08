import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  searchIssues,
  getIssue,
  getIssueComments,
  getIssueWorklogs,
  addWatcher,
  removeWatcher,
  getMyself,
} from "./utils/jira";
import { Preferences } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

function IssueDetail({ issueKey }: { issueKey: string }) {
  const { data: issue, isLoading: isLoadingIssue } = usePromise(getIssue, [issueKey]);
  const { data: comments, isLoading: isLoadingComments } = usePromise(getIssueComments, [issueKey]);
  const { data: worklogs, isLoading: isLoadingWorklogs } = usePromise(getIssueWorklogs, [issueKey]);

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (isLoadingIssue || isLoadingComments || isLoadingWorklogs) {
    return <Detail isLoading={true} />;
  }

  if (!issue) {
    return <Detail markdown="# Issue not found" />;
  }

  const fields = issue.fields;
  const renderedFields = issue.renderedFields || {};

  // Format description
  const description = renderedFields.description || fields.description || "No description provided";

  // Format subtasks

  const subtasks = fields.subtasks || [];
  const subtasksMarkdown =
    subtasks.length > 0
      ? subtasks
          .map(
            (st: { key: string; fields: { summary: string; status: { name: string } } }) =>
              `- [${st.key}](https://${domain}/browse/${st.key}) - ${st.fields.summary} (${st.fields.status.name})`,
          )
          .join("\n")
      : "_No subtasks_";

  // Format linked issues

  const issueLinks = fields.issuelinks || [];
  const linksMarkdown =
    issueLinks.length > 0
      ? issueLinks
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((link: any) => {
            const linkedIssue = link.outwardIssue || link.inwardIssue;
            const linkType = link.type.outward || link.type.inward;
            return `- ${linkType}: [${linkedIssue.key}](https://${domain}/browse/${linkedIssue.key}) - ${linkedIssue.fields.summary}`;
          })
          .join("\n")
      : "_No linked issues_";

  // Format comments
  const commentsMarkdown =
    comments && comments.length > 0
      ? comments
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((comment: any) => {
            const author = comment.author?.displayName || "Unknown";
            const created = new Date(comment.created).toLocaleString();
            const body = comment.renderedBody || comment.body || "";
            return `### ${author} - ${created}\n${body}\n`;
          })
          .join("\n---\n\n")
      : "_No comments_";

  // Format worklogs
  const worklogsMarkdown =
    worklogs && worklogs.length > 0
      ? worklogs
          .slice(0, 10)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((worklog: any) => {
            const author = worklog.author?.displayName || "Unknown";
            const timeSpent = worklog.timeSpent || "0m";
            const started = new Date(worklog.started).toLocaleDateString();
            const comment = worklog.comment || "";
            return `- **${author}** logged **${timeSpent}** on ${started}${comment ? `: ${comment}` : ""}`;
          })
          .join("\n")
      : "_No work logged_";

  // Build the markdown
  const markdown = `
# ${issue.key}: ${fields.summary}

## Details

- **Status**: ${fields.status.name}
- **Type**: ${fields.issuetype.name}
- **Priority**: ${fields.priority?.name || "None"}
- **Assignee**: ${fields.assignee?.displayName || "Unassigned"}
- **Reporter**: ${fields.reporter?.displayName || "Unknown"}
- **Created**: ${new Date(fields.created).toLocaleDateString()}
- **Updated**: ${new Date(fields.updated).toLocaleDateString()}
${fields.duedate ? `- **Due Date**: ${new Date(fields.duedate).toLocaleDateString()}` : ""}

---

## Description

${description}

---

## Subtasks (${subtasks.length})

${subtasksMarkdown}

---

## Linked Issues (${issueLinks.length})

${linksMarkdown}

---

## Recent Comments (${comments?.length || 0})

${commentsMarkdown}

---

## Work Logged (${worklogs?.length || 0})

${worklogsMarkdown}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${issue.key}: ${fields.summary}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key" text={issue.key} />
          <Detail.Metadata.Label title="Status" text={fields.status.name} />
          <Detail.Metadata.Label title="Type" text={fields.issuetype.name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Assignee" text={fields.assignee?.displayName || "Unassigned"} />
          <Detail.Metadata.Label title="Reporter" text={fields.reporter?.displayName || "Unknown"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={new Date(fields.created).toLocaleDateString()} />
          <Detail.Metadata.Label title="Updated" text={new Date(fields.updated).toLocaleDateString()} />
          {fields.labels && fields.labels.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Labels">
                {fields.labels.map((label: string) => (
                  <Detail.Metadata.TagList.Item key={label} text={label} />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://${domain}/browse/${issue.key}`} />
          <Action.CopyToClipboard content={issue.key} title="Copy Issue Key" />
          <Action.CopyToClipboard content={`https://${domain}/browse/${issue.key}`} title="Copy Issue URL" />
          <Action
            title={issue.fields.watches?.isWatching ? "Stop Watching" : "Start Watching"}
            icon={issue.fields.watches?.isWatching ? Icon.EyeSlash : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onAction={async () => {
              const currentUser = await getMyself();
              if (issue.fields.watches?.isWatching) {
                await removeWatcher(issue.key, currentUser.accountId);
                showToast({ style: Toast.Style.Success, title: "Stopped watching issue" });
              } else {
                await addWatcher(issue.key);
                showToast({ style: Toast.Style.Success, title: "Started watching issue" });
              }
              // We might need to revalidate here but detail view doesn't easily expose revalidate for the single issue.
              // But since it's a detail view, maybe just a toast is enough or we rely on re-entering.
              // Ideally we would invalidate the cache for this issue.
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data: issues, isLoading } = usePromise(
    (query) => {
      if (!query) return Promise.resolve([]);
      const jql = `(key = "${query}" OR summary ~ "${query}*" OR description ~ "${query}*") ORDER BY updated DESC`;
      return searchIssues(jql);
    },
    [searchText],
  );

  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for issue by key or summary..."
      throttle
    >
      {issues?.map((issue) => (
        <List.Item
          key={issue.id}
          title={issue.key}
          subtitle={issue.fields.summary}
          icon={issue.fields.issuetype.iconUrl}
          accessories={[{ text: issue.fields.status.name }]}
          actions={
            <ActionPanel>
              <Action
                title="View Details"
                icon={Icon.Eye}
                onAction={() => push(<IssueDetail issueKey={issue.key} />)}
              />
              <Action.OpenInBrowser url={`https://${preferences.jiraDomain}/browse/${issue.key}`} />
              <Action.CopyToClipboard content={issue.key} title="Copy Issue Key" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
