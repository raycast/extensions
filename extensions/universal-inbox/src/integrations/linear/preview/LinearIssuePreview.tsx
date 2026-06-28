import { PreviewDetail } from "../../../preview/PreviewDetail";
import { formatDate, formatElapsedTime } from "../../../utils";
import { LinearIssue, LinearIssuePriority } from "../types";
import { Notification } from "../../../notification";
import { Color, Detail, Image } from "@raycast/api";

interface LinearIssuePreviewProps {
  notification: Notification;
  linearIssue: LinearIssue;
}

const PRIORITY_LABEL: Record<LinearIssuePriority, string> = {
  [LinearIssuePriority.NoPriority]: "No priority",
  [LinearIssuePriority.Urgent]: "Urgent",
  [LinearIssuePriority.High]: "High",
  [LinearIssuePriority.Normal]: "Normal",
  [LinearIssuePriority.Low]: "Low",
};

const PRIORITY_COLOR: Record<LinearIssuePriority, Color> = {
  [LinearIssuePriority.NoPriority]: Color.SecondaryText,
  [LinearIssuePriority.Urgent]: Color.Red,
  [LinearIssuePriority.High]: Color.Orange,
  [LinearIssuePriority.Normal]: Color.Yellow,
  [LinearIssuePriority.Low]: Color.Blue,
};

function userIcon(avatarUrl?: string): Image.ImageLike | undefined {
  return avatarUrl ? { source: avatarUrl, mask: Image.Mask.Circle } : undefined;
}

export function LinearIssuePreview({ notification, linearIssue }: LinearIssuePreviewProps) {
  let markdown = `# ${linearIssue.identifier} ${linearIssue.title}`;
  if (linearIssue.creator) {
    markdown += `\n\n_Opened by ${linearIssue.creator.name} · ${formatElapsedTime(linearIssue.created_at)}_`;
  }
  if (linearIssue.description) {
    markdown += `\n\n${linearIssue.description}`;
  }

  const metadata = (
    <>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={linearIssue.state.name} color={linearIssue.state.color} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Priority">
        <Detail.Metadata.TagList.Item
          text={PRIORITY_LABEL[linearIssue.priority]}
          color={PRIORITY_COLOR[linearIssue.priority]}
        />
      </Detail.Metadata.TagList>
      {linearIssue.assignee ? (
        <Detail.Metadata.Label
          title="Assignee"
          text={linearIssue.assignee.name}
          icon={userIcon(linearIssue.assignee.avatar_url)}
        />
      ) : null}
      {linearIssue.creator ? (
        <Detail.Metadata.Label
          title="Creator"
          text={linearIssue.creator.name}
          icon={userIcon(linearIssue.creator.avatar_url)}
        />
      ) : null}
      {linearIssue.project ? (
        <Detail.Metadata.Link title="Project" target={linearIssue.project.url} text={linearIssue.project.name} />
      ) : null}
      {linearIssue.project_milestone ? (
        <Detail.Metadata.Label title="Milestone" text={linearIssue.project_milestone.name} />
      ) : null}
      <Detail.Metadata.Label title="Team" text={linearIssue.team.name} />
      {linearIssue.due_date ? <Detail.Metadata.Label title="Due" text={formatDate(linearIssue.due_date)} /> : null}
      {linearIssue.labels.length > 0 ? (
        <Detail.Metadata.TagList title="Labels">
          {linearIssue.labels.map((label) => (
            <Detail.Metadata.TagList.Item key={label.name} text={label.name} color={label.color} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
