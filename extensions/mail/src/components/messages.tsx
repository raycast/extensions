import { useState, useCallback, useRef } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as messageScripts from "../scripts/messages";
import { Account, Mailbox, Message, MessageProps } from "../types";
import { shortenText, formatDate, titleCase, invoke } from "../utils";
import { MailIcons } from "../utils/presets";
import * as cache from "../utils/cache";
import { MessageActions } from "./message-actions";

export const Messages = (props: { account: Account; mailbox: Mailbox }): JSX.Element => {
  const { account } = props;

  const [mailbox, setMailbox] = useState<Mailbox>(props.mailbox);

  const messagesAbortController = useRef<AbortController>(new AbortController());

  const {
    data: messages,
    mutate: mutateMessages,
    isLoading: isLoadingMessages,
  } = useCachedPromise(messageScripts.getAccountMessages, [account, mailbox], { abortable: messagesAbortController });

  const handleAction = useCallback((action: () => Promise<void>, account: Account, mailbox: Mailbox) => {
    mutateMessages(
      invoke(async () => {
        messagesAbortController.current.abort();

        await action();
        const messages = await messageScripts.getAccountMessages(account, mailbox);

        return messages;
      }),
      {
        optimisticUpdate: (data) => {
          if (!data) return data;

          const messages = cache.getMessages(account.id, mailbox.name);
          return messages;
        },
      }
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
      {messages?.map((message: Message, index: number) => (
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
