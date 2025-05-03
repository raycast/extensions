import { List } from "@raycast/api";
import { Chat } from "../types";

export const AnswerDetailView = (props: { chat: Chat; streamData?: Chat | undefined }) => {
  const { chat, streamData } = props;

  const isStreaming = streamData && streamData.id === chat.id;
  const markdown = `**${chat.question}**\n\n${isStreaming ? streamData.answer : chat.answer}`;

  return <List.Item.Detail markdown={markdown} />;
};
