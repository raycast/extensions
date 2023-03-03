import { Action, ActionPanel, Icon, LaunchType, List, launchCommand, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { stripHtml } from "string-strip-html";
import { useMasto } from "../hooks/masto";
import dedent from "dedent";
import FavoriteAction from "./status/FavoriteAction";
import ReblogAction from "./status/ReblogAction";
import { getIconForVisibility, getNameForVisibility, isVisiblityPrivate } from "../utils/visiblity";
import BookmarkAction from "./status/BookmarkAction";

export default function StatusItem({ status: originalStatus }: { status: mastodon.v1.Status }) {
  const masto = useMasto();
  const status = originalStatus.reblog ?? originalStatus;
  const content = status.spoilerText || status.text || stripHtml(status.content).result;
  const visibilityIcon = getIconForVisibility(status.visibility);

  return (
    <List.Item
      title={content}
      accessories={[
        { icon: status.account.avatar, text: status.account.acct },
        isVisiblityPrivate(status.visibility) && { icon: visibilityIcon },
      ].filter(Boolean)}
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
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Visibility"
                text={getNameForVisibility(status.visibility)}
                icon={visibilityIcon}
              />
              {status.application?.website && [
                <List.Item.Detail.Metadata.Separator />,
                <List.Item.Detail.Metadata.Link
                  title="Application"
                  text={status.application.name}
                  target={status.application.website}
                />,
              ]}
              {originalStatus.reblog && [
                <List.Item.Detail.Metadata.Separator />,
                <List.Item.Detail.Metadata.Label
                  title="Reblogged by"
                  text={originalStatus.account.displayName}
                  icon={originalStatus.account.avatar}
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
          <ReblogAction id={status.id} reblogged={status.reblogged ?? false} masto={masto} />
          <FavoriteAction id={status.id} favorited={status.favourited ?? false} masto={masto} />
          <BookmarkAction id={status.id} bookmarked={status.bookmarked ?? false} masto={masto} />
        </ActionPanel>
      }
    />
  );
}
