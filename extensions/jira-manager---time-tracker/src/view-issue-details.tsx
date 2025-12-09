import { List, Detail, ActionPanel, Action, Icon, useNavigation, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { searchIssues, getIssue, getIssueComments, getIssueWorklogs } from "./utils/jira";
import { Preferences } from "./utils/types";
import { IssueActions } from "./components/actions/IssueActions";
import { getActiveIssue } from "./utils/storage";
import TurndownService from "turndown";

const preferences = getPreferenceValues<Preferences>();

function IssueDetail({ issueKey }: { issueKey: string }) {
  const { data: issue, isLoading: isLoadingIssue, revalidate: revalidateIssue } = usePromise(getIssue, [issueKey]);
  const {
    data: comments,
    isLoading: isLoadingComments,
    revalidate: revalidateComments,
  } = usePromise(getIssueComments, [issueKey]);
  const {
    data: worklogs,
    isLoading: isLoadingWorklogs,
    revalidate: revalidateWorklogs,
  } = usePromise(getIssueWorklogs, [issueKey]);
  const { data: activeIssue, revalidate: revalidateActiveIssue } = usePromise(getActiveIssue);

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Initialize Turndown service for HTML to Markdown conversion
  const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

  if (isLoadingIssue || isLoadingComments || isLoadingWorklogs) {
    return <Detail isLoading={true} />;
  }

  if (!issue) {
    return <Detail markdown="# Issue not found" />;
  }

  const fields = issue.fields;
  const renderedFields = issue.renderedFields || {};

  // Format description
  // Use renderedFields (HTML) if available and convert to Markdown, otherwise fallback to plain text description
  let description = "No description provided";
  if (renderedFields.description) {
    try {
      description = turndownService.turndown(renderedFields.description);
    } catch {
      description = fields.description || "No description provided";
    }
  } else if (fields.description) {
    description = fields.description;
  }

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
            // Use renderedBody if available for rich text
            let body = "";
            if (comment.renderedBody) {
              try {
                body = turndownService.turndown(comment.renderedBody);
              } catch {
                body = comment.body || "";
              }
            } else {
              body = comment.body || "";
            }
            return `### ${author} - ${created}\n${body}\n`;
          })
          .join("\n---\n\n")
      : "_No comments_";

  // Helper to extract simple text from ADF (recursive)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractTextFromADF = (node: any): string => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (node.type === "text" && node.text) return node.text;
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractTextFromADF).join(" ");
    }
    return "";
  };

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

            let commentText = "";
            if (worklog.comment) {
              if (typeof worklog.comment === "string") {
                commentText = worklog.comment;
              } else {
                // Start from root node
                commentText = extractTextFromADF(worklog.comment);
              }
            }

            return `- **${author}** logged **${timeSpent}** on ${started}${commentText ? `: ${commentText}` : ""}`;
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

  const revalidateAll = () => {
    revalidateIssue();
    revalidateComments();
    revalidateWorklogs();
    revalidateActiveIssue();
  };

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
      actions={<IssueActions issue={issue} mutate={revalidateAll} activeIssue={activeIssue} />}
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data: activeIssue, revalidate: revalidateActiveIssue } = usePromise(getActiveIssue);

  const {
    data: issues,
    isLoading,
    revalidate: revalidateIssues,
  } = usePromise(
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
              <IssueActions
                issue={issue}
                mutate={() => {
                  revalidateIssues();
                  revalidateActiveIssue();
                }}
                activeIssue={activeIssue}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
