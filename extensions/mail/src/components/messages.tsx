import { useState, useEffect } from "react";
import { List, Icon } from "@raycast/api";
import * as messageScripts from "../scripts/messages";
import { shortenText, formatDate, titleCase } from "../utils/utils";
import { Account, Mailbox, Message, MessageProps } from "../types/types";
import { MailIcons } from "../utils/presets";
import { MessageActions } from "./message-actions";

export const Messages = (props: { account: Account; mailbox: Mailbox }): JSX.Element => {
  const [mailbox, setMailbox] = useState<Mailbox>(props.mailbox);
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
      setMessages(await messageScripts.getAccountMessages(props.account, mailbox, mailbox.name, 100));
      setIsLoading(false);
    })();
    return () => {
      setMessages([]);
    };
  }, [mailbox]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Search for emails"}
      navigationTitle={`${props.account.name} - ${titleCase(mailbox.name)}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Mailbox"
          defaultValue={mailbox.name}
          onChange={(name: string) => {
            setMailbox(props.account.mailboxes.find((mailbox) => mailbox.name === name) as Mailbox);
          }}
        >
          {props.account.mailboxes.map((mailbox) => (
            <List.Dropdown.Item
              key={mailbox.name}
              title={titleCase(mailbox.name)}
              value={mailbox.name}
              icon={mailbox.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {messages?.map((message: Message, index: number) => (
        <MessageListItem
          key={index}
          mailbox={mailbox}
          message={message}
          account={props.account}
          setMessage={setMessage}
          deleteMessage={deleteMessage}
        />
      ))}
    </List>
  );
};

export const MessageListItem = (props: MessageProps): JSX.Element => {
  const { message } = props;
  const attachments = `${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`;

  return (
    <List.Item
      title={message.subject ? shortenText(message.subject, 60) : "No Subject"}
      icon={message.read ? MailIcons.Read : MailIcons.Unread}
      accessories={[
        { text: formatDate(message.date), icon: Icon.Calendar },
        { text: shortenText(message.senderName, 20), icon: Icon.PersonCircle },
        message.numAttachments === 0 ? {} : { text: attachments, icon: Icon.Paperclip },
      ]}
      actions={<MessageActions {...props} />}
    />
  );
};
