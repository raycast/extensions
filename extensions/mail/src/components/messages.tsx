import { List, Detail, Icon, Action, ActionPanel, Color, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import * as messageScripts from "../scripts/messages";
import { ComposeMessage } from "./compose";
import { Message, Account } from "../types/types";
import { shortenText, formatDate, formatMarkdown } from "../utils/utils";

export const Messages = (account: Account): JSX.Element => {
  const [messages, setMessages] = useState<Message[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getMessages = async () => {
      const start = new Date().getTime();
      const messages = await messageScripts.getAccountMessages(account.id);
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
      title={shortenText(message.subject, 60)}
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
        { text: shortenText(message.sender, 20), icon: Icon.Person },
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
              target={<ComposeMessage reply={true} recipient={message.senderEmail} />}
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
            <Action
              title="Move to Junk"
              icon={{ source: "../assets/icons/junk.svg", tintColor: Color.PrimaryText }}
              onAction={async () => await messageScripts.moveToJunk(message)}
            />
            <Action
              title="Delete Message"
              icon={Icon.Trash}
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
          <Detail.Metadata.Label title="From" text={message.sender} icon={Icon.Person} />
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
