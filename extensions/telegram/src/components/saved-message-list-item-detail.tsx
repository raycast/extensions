import { List } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface SavedMessageListItemDetailProps {
  message: SavedMessage;
}

export function SavedMessageListItemDetail({ message }: SavedMessageListItemDetailProps) {
  const markdown = buildMarkdownWithMedia({
    text: message.text,
    media: message.media,
  });

  return <List.Item.Detail markdown={markdown} />;
}
