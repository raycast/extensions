import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { differenceInYears, format } from "date-fns";
import { MarkAsReadAction } from "./commonActions";
import { MessageDetail } from "./messageDetail";
import { ConversationInfo, Message, messageTextDescription } from "./slackClient";
import { dateDescription, today } from "./utils";

export function MessagesList(props: { conversation: ConversationInfo }) {
  const sections: { [title: string]: Message[] } = {};

  props.conversation.messages?.forEach((m) => {
    const diffY = differenceInYears(m.date, today);
    const dateString = diffY > 1 ? format(m.date, "dd MMM yyy") : format(m.date, "dd MMM");

    if (!sections[dateString]) {
      sections[dateString] = [];
    }
    sections[dateString].push(m);
  });

  return (
    <List navigationTitle={props.conversation.name}>
      {Object.keys(sections).map((key) => {
        const messages = sections[key];
        return (
          <List.Section key={key} title={key}>
            {messages.map((m) => (
              <MessageListItem key={m.ts} message={m} conversation={props.conversation} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function MessageListItem(props: { conversation: ConversationInfo; message: Message }) {
  return (
    <List.Item
      title={messageTextDescription(props.message)}
      accessoryTitle={dateDescription(props.message.date, true)}
      actions={
        <ActionPanel>
          <PushAction
            title="Open Message"
            icon={Icon.Bubble}
            target={<MessageDetail conversation={props.conversation} message={props.message} />}
          />
          <MarkAsReadAction title="Mark Channel as Read" conversation={props.conversation} />
        </ActionPanel>
      }
    />
  );
}
