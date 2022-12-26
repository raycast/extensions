import { useState, useEffect } from "react";
import { List, Icon } from "@raycast/api";
import * as messageScripts from "../scripts/messages";
import { shortenText, formatDate } from "../utils/utils";
import { Message, Account, MessageProps } from "../types/types";
import { Mailboxes, MailIcons } from "../utils/presets";
import { MessageActions } from "./message-actions";

export const Messages = (props: { account: Account; mailbox: string }): JSX.Element => {
  const [mailbox, setMailbox] = useState<string>(props.mailbox);
  const [messages, setMessages] = useState<Message[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setMessage = (account: Account, message: Message) => {
    setMessages(messages?.map((msg: Message) => (msg.id === message.id ? message : msg)));
  };
  const deleteMessage = (account: Account, message: Message) => {
    setMessages(messages?.filter((msg: Message) => msg.id !== message.id));
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setMessages(await messageScripts.getAccountMessages(props.account, mailbox, Mailboxes[mailbox].mailbox, 100));
      setIsLoading(false);
    })();
    return () => {
      setMessages([]);
    };
  }, [mailbox]);

  return (
    <List
      searchBarPlaceholder="Search for emails"
      isLoading={isLoading}
      navigationTitle={`${props.account.name} - ${Mailboxes[mailbox].title}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Mailbox" defaultValue={mailbox} onChange={setMailbox}>
          {Object.entries(Mailboxes).map(([id, mailbox]) => (
            <List.Dropdown.Item key={id} title={mailbox.title} value={id} />
          ))}
        </List.Dropdown>
      }
    >
      {messages?.map((message: Message, index: number) => (
        <MessageListItem
          key={index}
          {...props}
          message={message}
          setMessage={setMessage}
          deleteMessage={deleteMessage}
        />
      ))}
    </List>
  );
};

export const MessageListItem = (props: MessageProps): JSX.Element => {
  const message = props.message;
  const attachments = `${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`;

  return (
    <List.Item
      title={message.subject ? shortenText(message.subject, 60) : "No Subject"}
      icon={message.read ? MailIcons.Read : MailIcons.Unread}
      accessories={[
        { text: formatDate(message.date), icon: Icon.Calendar },
        { text: shortenText(message.senderName, 20), icon: Icon.Person },
        message.numAttachments === 0 ? {} : { text: attachments, icon: Icon.Paperclip },
      ]}
      actions={<MessageActions {...props} />}
    />
  );
};
