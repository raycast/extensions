import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as messageScripts from "../scripts/messages";
import { shortenText, formatDate, titleCase } from "../utils";
import { Account, Mailbox, Message, MessageProps } from "../types";
import { MailIcons } from "../utils/presets";
import { MessageActions } from "./message-actions";
import * as cache from "../utils/cache";

export const Messages = (props: { account: Account; mailbox: Mailbox }): JSX.Element => {
  const [mailbox, setMailbox] = useState<Mailbox>(props.mailbox);

  const {
    data: messages,
    isLoading: isLoadingMessages,
    revalidate: revalidateMessages,
  } = useCachedPromise(messageScripts.getAccountMessages, [props.account, mailbox, mailbox.name]);

  return (
    <List
      isLoading={isLoadingMessages}
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
          setMessage={(account, message) => {
            // TODO: We should update all mailboxes for the given account
            const cachedMessages = cache.getMessages(account.id, mailbox.name);
            const nextCachedMessages = cachedMessages.map((m) => {
              if (m.id === message.id) {
                m = { ...m, ...message };
              }
              return m;
            });
            cache.setMessages(nextCachedMessages, account.id, mailbox.name);
            revalidateMessages();
          }}
          deleteMessage={(account, message) => {
            // TODO: We should update all mailboxes for the given account
            const cachedMessages = cache.getMessages(account.id, mailbox.name);
            const nextCachedMessages = cachedMessages.filter((m) => m.id !== message.id);
            cache.setMessages(nextCachedMessages, account.id, mailbox.name);
            revalidateMessages();
          }}
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
