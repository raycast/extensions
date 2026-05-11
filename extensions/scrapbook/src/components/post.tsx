import { ActionPanel, Color, Icon, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { PostType } from "../lib/types";
import { reactionReadableName } from "../lib/utils";
import { PostOpenActions, RefreshAction } from "./actions";

const colors = [Color.Magenta, Color.Red, Color.Blue, Color.Green, Color.Yellow, Color.Purple, Color.Orange];

export default function Post({
  post,
  setSelectedReaction,
  revalidate,
  showAuthor = false,
}: {
  post: PostType;
  setSelectedReaction: (value: string) => void;
  revalidate: () => void;
  showAuthor?: boolean;
}) {
  const readableDate = new Date(post.postedAt).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const readableTime = new Date(post.postedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const fullReadableDateTime = `${readableDate} at ${readableTime}`;

  return (
    <List.Item
      key={post.id}
      keywords={[post.user.username]}
      title={post.text}
      subtitle={showAuthor ? post.user.username : undefined}
      detail={
        <List.Item.Detail
          markdown={post.text + post.attachments.map((a) => `![${"image"}](${a})`).join("\n")}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Reactions">
                {post.reactions.map((reaction) => {
                  return (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={reaction.name}
                      icon={reaction.url}
                      text={reactionReadableName(reaction.name)}
                      onAction={() => {
                        setSelectedReaction(reaction.name);
                      }}
                    />
                  );
                })}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Date Posted" icon={Icon.Clock} text={fullReadableDateTime} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Author">
                <List.Item.Detail.Metadata.TagList.Item
                  color={colors[Math.floor(Math.random() * colors.length)]}
                  icon={Icon.Person}
                  text={post.user.username}
                  onAction={async () => {
                    try {
                      await launchCommand({
                        name: "search-users",
                        type: LaunchType.UserInitiated,
                        context: { username: post.user.username },
                      });
                    } catch (err) {
                      showToast({ title: "Command not enabled", style: Toast.Style.Failure });
                    }
                  }}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Slack Link"
                target={post.slackUrl || ""}
                text={post.slackUrl ? "Open Slack" : "No Slack URL"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <RefreshAction revalidate={revalidate} />
          <PostOpenActions post={post} />
        </ActionPanel>
      }
    />
  );
}
