import { Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getIssue, Issue } from "../api/issues";
import { getAuthenticatedUri, getBaseUrl } from "../api/request";
import { getProjectAvatar, getUserAvatar } from "../helpers/avatars";
import { formatDate, getCustomFieldsForDetail, getMarkdownFromHtml, getStatusColor } from "../helpers/issues";
import { replaceAsync } from "../helpers/string";
import { useEpicIssues } from "../hooks/useIssues";

import IssueActions from "./IssueActions";
import IssueDetailCustomFields from "./IssueDetailCustomFields";

type IssueDetailProps = {
  initialIssue?: Issue;
  issueKey: string;
};

export default function IssueDetail({ initialIssue, issueKey }: IssueDetailProps) {
  const {
    data: issue,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (issueId) => {
      const issue = await getIssue(issueId);

      if (!issue) {
        return null;
      }
      const baseUrl = getBaseUrl();
      const description = issue.renderedFields?.description ?? "";
      // Resolve all the image URLs to data URIs in the cached promise for better performance
      // Jira images use partial URLs, so we need to prepend the base URL
      const resolvedDescription = await replaceAsync(description, /src="(.*?)"/g, async (_, uri) => {
        const dataUri = await getAuthenticatedUri(`${baseUrl}${uri}`, "image/jpeg");
        return `src="${dataUri}"`;
      });
      issue.renderedFields.description = resolvedDescription;

      return issue;
    },
    [issueKey],
    { initialData: initialIssue },
  );

  const { issues: epicIssues, isLoading: isLoadingEpicIssues } = useEpicIssues(issue?.key ?? "");

  const attachments = issue?.fields.attachment;
  const numberOfAttachments = attachments?.length ?? 0;
  const hasAttachments = numberOfAttachments > 0;
  const hasChildIssues =
    (issue?.fields.subtasks && issue.fields.subtasks.length > 0) || (epicIssues && epicIssues.length > 0);
  const { customMarkdownFields, customMetadataFields } = useMemo(() => getCustomFieldsForDetail(issue), [issue]);

  const markdown = useMemo(() => {
    if (!issue) {
      return "";
    }
    let markdown = `# ${issue.fields.summary} \n\n`;
    const description = issue.renderedFields?.description;

    if (description) {
      markdown += `\n\n${getMarkdownFromHtml(description)}`;
    }

    if (issue.fields.issuetype && issue.fields.issuetype.name === "Epic" && epicIssues) {
      markdown += "\n\n## Child Issues\n";
      epicIssues.forEach((childIssue) => {
        markdown += `- ${childIssue.key} - ${childIssue.fields.summary}\n`;
      });
    }

    const subtasks = issue.fields.subtasks;
    if (subtasks && subtasks.length > 0) {
      markdown += "\n\n## Child Issues\n";
      subtasks.forEach((subtask) => {
        markdown += `- ${subtask.key} - ${subtask.fields.summary}\n`;
      });
    }

    customMarkdownFields.forEach((markdownField) => {
      markdown += markdownField;
    });

    return markdown;
  }, [issue, epicIssues, customMarkdownFields]);

  return (
    <Detail
      navigationTitle={issue?.key}
      markdown={markdown}
      isLoading={isLoading || isLoadingEpicIssues}
      metadata={
        <Detail.Metadata>
          {hasAttachments ? (
            <Detail.Metadata.Label
              title="Attachments"
              text={`${numberOfAttachments > 1 ? `${numberOfAttachments} attachments` : "1 attachment"}`}
              icon={Icon.Paperclip}
            />
          ) : null}

          <Detail.Metadata.Label title="Issue Key" text={issue?.key} icon={issue?.fields.issuetype.iconUrl} />

          {issue?.fields.project ? (
            <Detail.Metadata.Label
              title="Project"
              text={issue.fields.project.name ?? "None"}
              icon={getProjectAvatar(issue.fields.project)}
            />
          ) : null}

          <Detail.Metadata.Label
            title="Status"
            text={{
              value: issue?.fields.status.name || "",
              color: issue?.fields.status.statusCategory
                ? getStatusColor(issue?.fields.status.statusCategory.colorName)
                : undefined,
            }}
          />

          <Detail.Metadata.Label
            title="Priority"
            text={issue?.fields.priority?.name ?? "None"}
            icon={issue?.fields.priority?.iconUrl}
          />

          <Detail.Metadata.Label
            title="Assignee"
            text={issue?.fields.assignee ? issue?.fields.assignee.displayName : "Unassigned"}
            icon={getUserAvatar(issue?.fields.assignee)}
          />

          {issue ? (
            <Detail.Metadata.Label
              title="Reporter"
              text={issue.fields.reporter ? issue.fields.reporter.displayName : "Unassigned"}
              icon={getUserAvatar(issue.fields.reporter)}
            />
          ) : null}

          {issue?.fields.labels && issue?.fields.labels.length > 0 ? (
            <Detail.Metadata.TagList title="Labels">
              {issue?.fields.labels.map((label, index) => {
                return <Detail.Metadata.TagList.Item key={index} text={label} />;
              })}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Labels" text="None" />
          )}

          {issue?.fields.components && issue?.fields.components.length > 0 ? (
            <Detail.Metadata.TagList title="Components">
              {issue?.fields.components.map((component) => {
                return <Detail.Metadata.TagList.Item key={component.id} text={component.name} />;
              })}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Components" text="None" />
          )}

          {issue?.fields.fixVersions && issue?.fields.fixVersions.length > 0 ? (
            <Detail.Metadata.TagList title="Fix Versions">
              {issue?.fields.fixVersions.map((version) => {
                return <Detail.Metadata.TagList.Item key={version.id} text={version.name} />;
              })}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Fix versions" text="None" />
          )}

          {issue?.fields.parent ? (
            <Detail.Metadata.Label
              title="Parent"
              text={issue.fields.parent.key}
              icon={issue.fields.parent.fields.issuetype.iconUrl}
            />
          ) : null}

          {issue?.fields.duedate ? (
            <Detail.Metadata.Label title="Due Date" text={formatDate(issue.fields.duedate)} />
          ) : null}

          <IssueDetailCustomFields fields={customMetadataFields} />
        </Detail.Metadata>
      }
      {...(issue
        ? {
            actions: (
              <IssueActions
                issue={issue}
                showChildIssuesAction={hasChildIssues}
                showAttachmentsAction={hasAttachments}
                mutateDetail={mutate}
              />
            ),
          }
        : null)}
    />
  );
}
