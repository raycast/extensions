import { List } from "@raycast/api";
import { TalkType } from "../../type/talk";

export const AnswerDetailView = (props: { chat: TalkType; streamData?: TalkType | undefined }) => {
  const { chat, streamData } = props;

  const isStreaming = streamData && streamData.chatId === chat.chatId;
  let markdown = ``;

  markdown += `${isStreaming ? streamData.result?.text : chat.result ? chat.result?.text : "..."}\n\n`;
  if (chat.result?.imageExist && chat.result.images) {
    markdown += `![](${chat.result.images[0]})\n\n`;
  }
  markdown += `---\n\n`;
  markdown += `**Question:**\n\n`;
  markdown += `${chat.question.text}\n\n`;
  if (chat.question.files) {
    markdown += `![](${chat.question.files[0].path})\n\n`;
  }
  if (chat.result?.actionStatus) {
    markdown += `---\n\n`;
    markdown += `**${chat.result.actionType.charAt(0).toUpperCase() + chat.result.actionType.slice(1)}:**\n\n`;
    markdown += `${chat.result.actionName}; ${chat.result.actionStatus}\n`;
  }

  return <List.Item.Detail markdown={markdown} />;
};
