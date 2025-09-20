import { useState, useCallback, useRef } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { MessageActions } from "./message-actions";
import { Account, Mailbox, MessageProps } from "../types";
import { getMessages } from "../scripts/messages";
import { shortenText, toRelative, titleCase, invoke, isValidDate } from "../utils";
import { MailIcon } from "../utils/presets";
import { Cache } from "../utils/cache";

export type MessageListProps = {
  account: Account;
  mailbox: Mailbox;
};

export const MessageList = (props: MessageListProps) => {
  const { account } = props;

  const [mailbox, setMailbox] = useState<Mailbox>(props.mailbox);

  const messagesAbortController = useRef<AbortController>(new AbortController());

  const {
    data: messages,
    mutate: mutateMessages,
    isLoading: isLoadingMessages,
  } = useCachedPromise(getMessages, [account, mailbox], { abortable: messagesAbortController });

  const handleAction = useCallback((action: () => Promise<void>, account: Account, mailbox: Mailbox) => {
    mutateMessages(
      invoke(async () => {
        messagesAbortController.current.abort();

        await action();
        const messages = await getMessages(account, mailbox);

        return messages;
      }),
      {
        optimisticUpdate: (data) => {
          if (!data) return data;

          const messages = Cache.getMessages(account.id, mailbox.name);
          return messages;
        },
      },
    );
  }, []);

  return (
    <List
      isLoading={isLoadingMessages}
      searchBarPlaceholder={"Search for emails"}
      navigationTitle={`${account.name} - ${titleCase(mailbox.name)}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Mailbox"
          defaultValue={mailbox.name}
          onChange={(name: string) => {
            setMailbox(account.mailboxes.find((mailbox) => mailbox.name === name) as Mailbox);
          }}
        >
          {account.mailboxes.map((mailbox) => (
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
      {messages?.map((message, index) => (
        <MessageListItem
          key={index}
          mailbox={mailbox}
          message={message}
          account={account}
          onAction={(action) => {
            handleAction(action, account, mailbox);
          }}
        />
      ))}
    </List>
  );
};

export const MessageListItem = (props: MessageProps) => {
  const { message } = props;

  return (
    <List.Item
      title={message.subject ? shortenText(message.subject, 60) : "No Subject"}
      icon={message.read ? MailIcon.Read : MailIcon.Unread}
      accessories={[
        message.numAttachments > 0
          ? {
              text: message.numAttachments.toString(),
              icon: Icon.Paperclip,
              tooltip: `${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`,
            }
          : {},
        { text: shortenText(message.senderName, 20), icon: Icon.PersonCircle },
        isValidDate(message.date) ? { text: toRelative(message.date), icon: Icon.Calendar } : {},
      ]}
      actions={<MessageActions {...props} />}
    />
  );
};
