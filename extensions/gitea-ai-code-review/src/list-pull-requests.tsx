import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GiteaAPI } from "./api/gitea";
import { GiteaPullRequest } from "./types";
import ReviewPullRequest from "./review-pull-request";

export default function ListPullRequests() {
  const giteaApi = new GiteaAPI();

  const {
    data: pullRequests,
    isLoading,
    error,
  } = usePromise(async () => await giteaApi.getPullRequests("open"));

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Pull Requests"
          description={error.message}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pull requests...">
      {pullRequests?.map((pr) => (
        <PullRequestItem key={pr.id} pullRequest={pr} />
      ))}
    </List>
  );
}

function PullRequestItem({ pullRequest }: { pullRequest: GiteaPullRequest }) {
  const prNumber = pullRequest.number;
  const title = pullRequest.title;
  const author = pullRequest.user.login;
  const createdAt = new Date(pullRequest.created_at).toLocaleDateString();
  const branch = `${pullRequest.head.ref} → ${pullRequest.base.ref}`;

  return (
    <List.Item
      icon={{ source: Icon.Code, tintColor: Color.Green }}
      title={`#${prNumber} ${title}`}
      subtitle={author}
      accessories={[
        { text: branch, icon: Icon.CodeBlock },
        { text: createdAt, icon: Icon.Calendar },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Review with AI"
            icon={Icon.Wand}
            target={<ReviewPullRequest prNumber={prNumber} />}
          />
          <Action.OpenInBrowser
            title="Open in Gitea"
            url={pullRequest.html_url}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Pull Request URL"
            content={pullRequest.html_url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
