import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useTranslate } from "./hooks.js";
import { PostItem } from "./types.js";

export default function GridItem({
  post,
  onPreview,
  onRefresh,
}: {
  post: PostItem;
  onPreview: () => void;
  onRefresh: () => void;
}) {
  const { data: translatedTitle } = useTranslate(post.title);
  const { data: translatedNickname } = useTranslate(post.user.nickname);

  return (
    <Grid.Item
      title={translatedTitle || post.title}
      subtitle={translatedNickname || post.user.nickname}
      content={{
        source: post.cover,
      }}
      actions={
        <ActionPanel>
          <Action icon={Icon.Eye} title="Preview Detail" onAction={onPreview} />
          <Action icon={Icon.Repeat} title="Refresh" shortcut={{ key: "r", modifiers: ["cmd"] }} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
