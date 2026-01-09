import { List } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface MessageListItemDetailProps {
  message: SavedMessage;
}

export function MessageListItemDetail({ message }: MessageListItemDetailProps) {
  const markdown = buildMarkdownWithMedia({
    media: message.media,
    text: message.text,
  });

  return <List.Item.Detail markdown={markdown} />;
}
