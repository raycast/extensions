import { List } from "@raycast/api";
import { Chat } from "../type";

export const AnswerDetailView = (props: { chat: Chat; streamData?: Chat | undefined }) => {
  const { chat, streamData } = props;
  const isStreaming = streamData && streamData.id === chat.id;

  const width = Math.floor(430 / Math.min(Math.max(chat.files.length, 1), 2));
  const images: string = chat.files?.map((file) => `![](file://${file}?raycast-width=${width})`).join("\n") || "";

  const markdown = `${
    isStreaming ? streamData?.answer : chat.answer
  }\n\`\`\`\n${chat.question.trimEnd()}\n\`\`\`\n${images}\n\n`;

  return <List.Item.Detail markdown={markdown} />;
};
