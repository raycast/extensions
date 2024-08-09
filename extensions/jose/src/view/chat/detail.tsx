import { List } from "@raycast/api";
import { ITalk } from "../../ai/type";

export const AnswerDetailView = (props: { chat: ITalk; streamData?: ITalk | undefined }) => {
  const { chat, streamData } = props;

  const isStreaming = streamData && streamData.id === chat.id;
  let markdown = ``;

  markdown += `${isStreaming ? streamData.result?.content : chat.result ? chat.result?.content : "..."}\n\n`;
  if (chat.result?.image && chat.result.image.exist) {
    markdown += `![](${chat.result.image.url[0]})\n\n`;
  }
  markdown += `---\n\n`;
  markdown += `**Question:**\n\n`;
  markdown += `${chat.conversation.question.content}\n\n`;
  if (chat.conversation.question.files) {
    markdown += `![](${chat.conversation.question.files[0].path})\n\n`;
  }
  if (chat.result?.action?.status) {
    markdown += `---\n\n`;
    markdown += `**${chat.result.action.type.charAt(0).toUpperCase() + chat.result.action.type.slice(1)}:**\n\n`;
    markdown += `${chat.result.action.name}; ${chat.result.action.status}\n`;
  }

  return <List.Item.Detail markdown={markdown} />;
};
