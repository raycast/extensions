import { ActionPanel, Detail, OpenInBrowserAction, OpenWithAction } from "@raycast/api";
import { ConversationInfo, Message, messageTextDescription } from "./slackClient";
import { dateDescription } from "./utils";

export function MessageDetail(props: { conversation: ConversationInfo; message: Message }) {
  const message = props.message;
  const markdownString = `
## ${message.author}

_${dateDescription(message.date, true)}_

### ${messageTextDescription(message)}
`;
  return (
    <Detail
      navigationTitle={props.conversation.name}
      markdown={markdownString}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url="slack://channel?team=" title="Open in Slack" icon="hashtag-16.png" />
        </ActionPanel>
      }
    />
  );
}
