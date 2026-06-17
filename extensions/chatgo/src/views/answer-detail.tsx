import { List } from "@raycast/api";
import { Chat } from "../type";

export const AnswerDetailView = (props: { chat: Chat; markdown?: string | null | undefined }) => {
  const { chat, markdown } = props;
  return <List.Item.Detail markdown={markdown ?? `**${chat.question}**\n\n${chat.answer}`} />;
};
