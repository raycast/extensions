import { Action, ActionPanel, Icon, LaunchType, List, launchCommand, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { stripHtml } from "string-strip-html";
import { useMasto } from "../hooks/masto";
import dedent from "dedent";

export default function StatusItem({ status }: { status: mastodon.v1.Status }) {
  const masto = useMasto();
  const content = status.spoilerText || status.text || stripHtml(status.content).result;
  return (
    <List.Item
      title={content}
      accessories={[{ icon: status.account.avatar, text: status.account.acct }]}
      detail={
        <List.Item.Detail
          markdown={dedent`
            ## ${status.account.displayName} \`${status.account.acct}\`

            ${content}

            ${status.mediaAttachments.map((media) => {
              switch (media.type) {
                case "image":
                case "gifv":
                  return `![${media.description ?? ""}](${media.previewUrl})`;
                default:
                  return "";
              }
            })}

            ${status.card ? `[${status.card.title}](${status.card.url})` : ""}
          `}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Reblogs" text={String(status.reblogsCount)} icon={Icon.Repeat} />
              <List.Item.Detail.Metadata.Label
                title="Favorites"
                text={String(status.favouritesCount)}
                icon={Icon.Star}
              />
              <List.Item.Detail.Metadata.Label title="Replies" text={String(status.repliesCount)} icon={Icon.Reply} />
              {status.application && [
                <List.Item.Detail.Metadata.Separator />,
                <List.Item.Detail.Metadata.Label
                  title="Application"
                  text={status.application?.name}
                  icon={Icon.AppWindow}
                />,
              ]}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {status.url && <Action.OpenInBrowser url={status.url} />}
          <Action
            title="Reply"
            icon={Icon.Reply}
            onAction={async () => {
              launchCommand({ name: "post", type: LaunchType.UserInitiated, context: { replyTo: status } });
            }}
          />
          <Action
            title="Reblog"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              masto?.v1.statuses.reblog(status.id);
              showToast({ title: "Successfully rebloged!" });
            }}
          />
          <Action
            title="Favorite"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={async () => {
              masto?.v1.statuses.favourite(status.id);
              showToast({ title: "Successfully added to your favorites!" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
