import { List } from "@raycast/api";
import { Chat } from "../type";

export const AnswerDetailView = (props: { chat: Chat; streamData?: Chat | undefined }) => {
  const { chat, streamData } = props;
  const isStreaming = streamData && streamData.id === chat.id;

  // FIXME: https://github.com/raycast/extensions/issues/12359
  // Maybe save base64 inner Chat object is also a bad idea, waiting for raycast allow local file access
  // const images: string = chat.images?.map((image) => `![](${image})`).join("\n") || "";

  const markdown = `${isStreaming ? streamData?.answer : chat.answer}\n\`\`\`\n${chat.question.trimEnd()}\n\`\`\`\n`;

  return <List.Item.Detail markdown={markdown} />;
};
