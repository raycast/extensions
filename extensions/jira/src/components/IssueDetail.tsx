import { Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getIssue, Issue } from "../api/issues";
import { formatDate, getCustomFieldsForDetail, getIssueDescription, getStatusColor } from "../helpers/issues";

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
  } = useCachedPromise((issueId) => getIssue(issueId), [issueKey], { initialData: initialIssue });

  const attachments = issue?.fields.attachment;
  const numberOfAttachments = attachments?.length ?? 0;
  const hasAttachments = numberOfAttachments > 0;

  const { customMarkdownFields, customMetadataFields } = useMemo(() => getCustomFieldsForDetail(issue), [issue]);

  const markdown = useMemo(() => {
    if (!issue) {
      return "";
    }

    let markdown = `# ${issue.fields.summary}`;
    const description = issue.renderedFields?.description;

    if (description) {
      markdown += `\n\n${getIssueDescription(description)}`;
    }

    customMarkdownFields.forEach((markdownField) => {
      markdown += markdownField;
    });

    return markdown;
  }, [issue]);

  return (
    <Detail
      navigationTitle={issue?.key}
      markdown={markdown}
      isLoading={isLoading}
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

          <Detail.Metadata.Label
            title="Project"
            text={issue?.fields.project?.name ?? "None"}
            icon={issue?.fields.project?.avatarUrls["32x32"]}
          />

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
            icon={issue?.fields.assignee ? issue?.fields.assignee.avatarUrls["32x32"] : Icon.Person}
          />

          {issue ? (
            <Detail.Metadata.Label
              title="Reporter"
              text={issue.fields.reporter ? issue.fields.reporter.displayName : "Unassigned"}
              icon={issue.fields.reporter ? issue.fields.reporter.avatarUrls["32x32"] : Icon.Person}
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
        ? { actions: <IssueActions issue={issue} showAttachmentsAction={hasAttachments} mutateDetail={mutate} /> }
        : null)}
    />
  );
}
