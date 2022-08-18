import { List, Detail, Icon, Action, ActionPanel, Color, closeMainWindow, showToast, Toast } from "@raycast/api";
import React, { useState, useEffect } from "react";
import * as messageScripts from "../scripts/messages";
import { saveAllAttachments } from "../scripts/attachments";
import { ComposeMessage } from "./compose";
import { Message, Account } from "../types/types";
import { shortenText, formatDate, formatMarkdown } from "../utils/utils";
import { Attachments } from "./attachments";

export const Messages = (account: Account): JSX.Element => {
  const [messages, setMessages] = useState<Message[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getMessages = async () => {
      const start = new Date().getTime();
      const messages = await messageScripts.getAccountMessages(account.id, 100);
      setMessages(messages);
      const time_elapsed = new Date().getTime() - start;
      console.log(`Time elapsed: ${time_elapsed / 1000}s`);
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
        <MessageListItem key={index} {...message} />
      ))}
    </List>
  );
};

export const MessageListItem = (message: Message): JSX.Element => {
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
      actions={
        <ActionPanel>
          <Action
            title="See in Mail"
            icon={"../assets/icons/mail-icon.png"}
            onAction={async () => {
              try {
                await messageScripts.openMessage(message);
                await closeMainWindow();
              } catch (error) {
                showToast(Toast.Style.Failure, "Failed To Open In Mail");
                console.error(error);
              }
            }}
          />
          <Action.Push title="See Message" icon={Icon.QuoteBlock} target={<MailMessage {...message} />} />
          <ActionPanel.Section>
            <Action.Push
              title="Reply"
              icon={Icon.Reply}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              target={<ComposeMessage reply={true} recipient={message.senderAddress} />}
            />
            <Action.Push
              title="Forward"
              icon={Icon.ArrowUpCircle}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              target={<ComposeMessage forward={true} />}
            />
            <Action.Push
              title="Redirect"
              icon={Icon.ArrowRightCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              target={<ComposeMessage redirect={true} />}
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
                  await messageScripts.toggleMessageRead(message);
                  showToast(Toast.Style.Success, `Message Marked as ${message.read ? "Unread" : "Read"}`);
                } catch (error) {
                  showToast(Toast.Style.Failure, `Failed To Mark Message as ${message.read ? "Unread" : "Read"}`);
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
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
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
              onAction={async () => await messageScripts.moveToJunk(message)}
            />
            <Action
              title="Delete Message"
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={async () => await messageScripts.deleteMessage(message)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export const MailMessage = (message: Message): JSX.Element => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getContent = async () => {
      console.log(message.account);
      console.log(message.id);
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
      actions={
        <ActionPanel>
          <Action title="See in Mail" icon={"../assets/mail.png"} onAction={() => {}} />
          <Action title="Reply" icon={Icon.Reply} onAction={() => {}} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          <Action
            title="Forward"
            icon={Icon.ArrowUpCircle}
            onAction={() => {}}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title="Redirect"
            icon={Icon.ArrowRightCircle}
            onAction={() => {}}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
};
