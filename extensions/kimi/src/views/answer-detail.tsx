import { List } from "@raycast/api";
import { Chat } from "../type";

export const AnswerDetailView = (props: { chat: Chat; streamData?: Chat | undefined }) => {
  const { chat, streamData } = props;
  const isStreaming = streamData && streamData.id === chat.id;

  const markdown = `${isStreaming ? streamData?.answer : chat.answer}`;

  return <List.Item.Detail markdown={markdown} />;
};
