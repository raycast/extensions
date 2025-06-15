import { Action, ActionPanel, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { PostType, UserType } from "../lib/types";

export function RefreshAction({ revalidate }: { revalidate: () => void }) {
  return <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={async () => revalidate()} />;
}

export function UserCommandActions({ user }: { user: UserType }) {
  return (
    <Action
      title="View User's Posts"
      icon={Icon.Book}
      onAction={() => {
        try {
          launchCommand({
            name: "search-users-posts",
            type: LaunchType.UserInitiated,
            context: { username: user.username },
          });
        } catch (err) {
          showToast({ title: "Command not enabled", style: Toast.Style.Failure });
        }
      }}
    />
  );
}

export function UserCopyActions({ user }: { user: UserType }) {
  return (
    <ActionPanel.Section>
      {user.username && (
        <Action.CopyToClipboard
          title="Copy Username"
          content={user.username}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
        />
      )}
      {user.email && (
        <Action.CopyToClipboard title="Copy Email" content={user.email} shortcut={{ modifiers: ["cmd"], key: "e" }} />
      )}
      {user.website && (
        <Action.CopyToClipboard
          title="Copy Website"
          content={user.website}
          shortcut={{ modifiers: ["cmd"], key: "w" }}
        />
      )}
      {user.github && (
        <Action.CopyToClipboard title="Copy Github" content={user.github} shortcut={{ modifiers: ["cmd"], key: "g" }} />
      )}
      <Action.CopyToClipboard
        title="Copy Scrapbook URL"
        content={user.customDomain || `https://scrapbook.hackclub.com/${encodeURIComponent(user.username)}`}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
    </ActionPanel.Section>
  );
}

export function PostOpenActions({ post }: { post: PostType }) {
  return (
    <>{post.slackUrl && <Action.OpenInBrowser title="Open In Slack" icon={Icon.Link} url={post.slackUrl ?? ""} />}</>
  );
}
