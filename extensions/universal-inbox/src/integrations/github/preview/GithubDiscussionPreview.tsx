import { getGithubActorName, GithubDiscussion } from "../types";
import { PreviewDetail } from "../../../preview/PreviewDetail";
import { cleanHtml, formatElapsedTime } from "../../../utils";
import { Notification } from "../../../notification";
import { Detail } from "@raycast/api";

interface GithubDiscussionPreviewProps {
  notification: Notification;
  githubDiscussion: GithubDiscussion;
}

export function GithubDiscussionPreview({ notification, githubDiscussion: discussion }: GithubDiscussionPreviewProps) {
  let markdown = `# ${discussion.title} #${discussion.number}`;
  if (discussion.author) {
    markdown += `\n\n_Opened by ${getGithubActorName(discussion.author)} · ${formatElapsedTime(discussion.created_at)}_`;
  }
  if (discussion.body) {
    markdown += `\n\n${cleanHtml(discussion.body)}`;
  }
  if (discussion.answer) {
    markdown += `\n\n---\n\n## ✅ Answer`;
    markdown += `\n\n**${getGithubActorName(discussion.answer.author)}**\n\n${cleanHtml(discussion.answer.body)}`;
  }

  const metadata = (
    <>
      <Detail.Metadata.Label title="Repository" text={discussion.repository.name_with_owner} />
      {discussion.state_reason ? <Detail.Metadata.Label title="State" text={discussion.state_reason} /> : null}
      <Detail.Metadata.Label title="Comments" text={`${discussion.comments_count}`} />
      <Detail.Metadata.Label title="Updated" text={formatElapsedTime(discussion.updated_at)} />
      {discussion.answer_chosen_by ? (
        <Detail.Metadata.Label title="Answered by" text={getGithubActorName(discussion.answer_chosen_by)} />
      ) : null}
      {discussion.labels.length > 0 ? (
        <Detail.Metadata.TagList title="Labels">
          {discussion.labels.map((label) => (
            <Detail.Metadata.TagList.Item key={label.name} text={label.name} color={`#${label.color}`} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
