import { Action, ActionPanel, Icon, LaunchType, List, confirmAlert, launchCommand, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { stripHtml } from "string-strip-html";
import { useMasto, useMe } from "../hooks/masto";
import dedent from "dedent";
import FavoriteAction from "./status/FavoriteAction";
import ReblogAction from "./status/ReblogAction";
import { getIconForVisibility, getNameForVisibility, isVisiblityPrivate } from "../utils/visiblity";
import BookmarkAction from "./status/BookmarkAction";

interface Props {
  status: mastodon.v1.Status;
  revalidate?: () => Promise<unknown>;
}

export default function StatusItem({ status: originalStatus, revalidate }: Props) {
  const masto = useMasto();
  const { data: me, isLoading } = useMe(masto);
  const status = originalStatus.reblog ?? originalStatus;
  const content = status.spoilerText || status.text || stripHtml(status.content).result;

  return (
    <List.Item
      title={content}
      accessories={[
        { icon: status.account.avatar, text: status.account.acct },
        isVisiblityPrivate(status.visibility) && { icon: getIconForVisibility(status.visibility) },
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
                icon={getIconForVisibility(status.visibility)}
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
          {status.account.id === me?.id && (
            <ActionPanel.Section title="Manage my status">
              <Action
                title="Delete"
                icon={Icon.MinusCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  if (!(await confirmAlert({ title: "Are you sure?" }))) return;
                  await masto?.v1.statuses.remove(status.id);
                  await revalidate?.();
                  showToast({ title: "Successfully deleted!" });
                }}
              />
              <Action
                title="Edit"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={async () => {
                  const source = await masto?.v1.statuses.fetchSource(status.id);
                  launchCommand({
                    name: "post",
                    type: LaunchType.UserInitiated,
                    context: {
                      action: "edit",
                      status: {
                        ...status,
                        text: source?.text,
                        spoilerText: source?.spoilerText,
                      },
                    },
                  });
                }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
