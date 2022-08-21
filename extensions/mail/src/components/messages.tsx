import {
  List,
  Detail,
  Icon,
  Action,
  ActionPanel,
  Color,
  closeMainWindow,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import * as messageScripts from "../scripts/messages";
import { OutgoingMessageAction, OutgoingMessageIcons } from "../scripts/outgoing-message";
import { saveAllAttachments } from "../scripts/attachments";
import { ComposeMessage } from "./compose";
import { Message, Account } from "../types/types";
import { shortenText, formatDate, formatMarkdown } from "../utils/utils";
import { Attachments } from "./attachments";

export const Messages = (account: Account): JSX.Element => {
  const [messages, setMessages] = useState<Message[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setMessage = (message: Message) => {
    setMessages(messages?.map((msg: Message) => (msg.id === message.id ? message : msg)));
  };
  const deleteMessage = (message: Message) => {
    setMessages(messages?.filter((msg: Message) => msg.id !== message.id));
  };

  useEffect(() => {
    const getMessages = async () => {
      setMessages(await messageScripts.getAccountMessages(account, "all", "All Mail", 100));
      setIsLoading(false);
    };
    getMessages();
    return () => {
      setMessages([]);
    };
  }, []);

  return (
    <List isLoading={isLoading}>
      {messages?.map((message: Message, index: number) => (
        <MessageListItem
          key={index}
          account={account}
          message={message}
          setMessage={setMessage}
          deleteMessage={deleteMessage}
        />
      ))}
    </List>
  );
};

type MessageProps = {
  account: Account;
  message: Message;
  setMessage?: (message: Message) => void;
  deleteMessage?: (message: Message) => void;
};

export const MessageListItem = (props: MessageProps): JSX.Element => {
  const message = props.message;

  return (
    <List.Item
      title={message.subject ? shortenText(message.subject, 60) : "No Subject"}
      icon={
        message.read
          ? {
              source: Icon.CheckCircle,
              tintColor: "#a7a7a7",
            }
          : {
              source: Icon.CircleProgress100,
              tintColor: "#0984ff",
            }
      }
      accessories={[
        { text: formatDate(message.date), icon: Icon.Calendar },
        { text: shortenText(message.senderName, 20), icon: Icon.Person },
        message.numAttachments > 0
          ? {
              text: `${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`,
              icon: Icon.Paperclip,
            }
          : {},
      ]}
      actions={<MessageActions {...props} />}
    />
  );
};

export const MailMessage = (props: MessageProps): JSX.Element => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let message = props.message;

  useEffect(() => {
    const getContent = async () => {
      message = await messageScripts.getMessageContent(message);
      setContent(message.content);
      setIsLoading(false);
    };
    getContent();
    return () => {
      setContent(null);
    };
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={!isLoading && content ? formatMarkdown(message.subject, content) : undefined}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={message.senderName} icon={Icon.Person} />
          <Detail.Metadata.Label title="Received" text={formatDate(message.date)} icon={Icon.Calendar} />
        </Detail.Metadata>
      }
      actions={<MessageActions {...props} inMessageView={true} />}
    />
  );
};

const MessageActions = (props: MessageProps & { inMessageView?: boolean }): JSX.Element => {
  const message = props.message;
  const navigation = useNavigation();
  const pop = props.inMessageView ? navigation.pop : () => {};
  return (
    <ActionPanel>
      <Action
        title="See in Mail"
        icon={"../assets/icons/mail-icon.png"}
        onAction={async () => {
          try {
            await messageScripts.openMessage(message);
            await closeMainWindow();
          } catch (error) {
            await showToast(Toast.Style.Failure, "Failed To Open In Mail");
            console.error(error);
          }
        }}
      />
      {!props.inMessageView && (
        <Action.Push title="See Message" icon={Icon.QuoteBlock} target={<MailMessage {...props} />} />
      )}
      <ActionPanel.Section>
        <Action.Push
          title={OutgoingMessageAction.Reply}
          icon={OutgoingMessageIcons[OutgoingMessageAction.Reply]}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Reply} />}
        />
        <Action.Push
          title={OutgoingMessageAction.ReplyAll}
          icon={OutgoingMessageIcons[OutgoingMessageAction.ReplyAll]}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.ReplyAll} />}
        />
        <Action.Push
          title={OutgoingMessageAction.Forward}
          icon={OutgoingMessageIcons[OutgoingMessageAction.Forward]}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Forward} />}
        />
        <Action.Push
          title={OutgoingMessageAction.Redirect}
          icon={OutgoingMessageIcons[OutgoingMessageAction.Redirect]}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
          target={<ComposeMessage {...props} action={OutgoingMessageAction.Redirect} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={message.read ? "Mark as Unread" : "Mark as Read"}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          icon={
            message.read
              ? {
                  source: Icon.CircleProgress100,
                  tintColor: "#0984ff",
                }
              : Icon.CheckCircle
          }
          onAction={async () => {
            try {
              if (props.setMessage) props.setMessage({ ...message, read: !message.read });
              await messageScripts.toggleMessageRead(message);
              await showToast(Toast.Style.Success, `Message Marked as ${message.read ? "Unread" : "Read"}`);
            } catch (error) {
              await showToast(Toast.Style.Failure, `Failed To Mark Message as ${message.read ? "Unread" : "Read"}`);
              console.error(error);
            }
          }}
        />
        {message.numAttachments > 0 && (
          <React.Fragment>
            <Action.Push
              icon={Icon.Paperclip}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              title={`See ${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`}
              target={<Attachments {...message} />}
            />
            <Action
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              icon={{ source: "../assets/icons/save.png", tintColor: Color.PrimaryText }}
              title={`Save ${message.numAttachments} Attachment${message.numAttachments > 1 ? "s" : ""}`}
              onAction={async () => {
                await saveAllAttachments(message);
              }}
            />
          </React.Fragment>
        )}
        <Action
          title="Move to Junk"
          shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          icon={{ source: "../assets/icons/junk.svg", tintColor: Color.PrimaryText }}
          onAction={async () => {
            if (props.deleteMessage) props.deleteMessage(message);
            await messageScripts.moveToJunk(message);
            pop();
          }}
        />
        <Action
          title="Delete Message"
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          onAction={async () => {
            if (props.deleteMessage) props.deleteMessage(message);
            await messageScripts.deleteMessage(message);
            pop();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
