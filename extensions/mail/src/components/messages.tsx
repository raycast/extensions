import { List, Detail, Icon, Action, ActionPanel, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAccountMessages, getMessageContent } from "../scripts/messages";
import { Message, Account } from "../types/types";
import { shortenText, formatDate } from "../utils/utils";

export const Messages = (account: Account): JSX.Element => {
  const [messages, setMessages] = useState<Message[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getMessages = async () => {
      const start = new Date().getTime();
      const messages = await getAccountMessages(account.id);
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
      accessories={[
        { text: formatDate(message.date), icon: Icon.Calendar },
        { text: shortenText(message.sender, 20), icon: Icon.Person },
        {
          icon: {
            source: !message.read ? Icon.CircleFilled : Icon.Circle,
            tintColor: !message.read ? Color.Blue : Color.SecondaryText,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="See in Mail" icon={"../assets/mail.png"} onAction={() => {}} />
          <Action.Push title="See Message" icon={Icon.QuoteBlock} target={<MailMessage {...message} />} />
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

export const MailMessage = (message: Message): JSX.Element => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getContent = async () => {
      message = await getMessageContent(message);
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
      markdown={!isLoading ? `# ${message.subject}\n\n${content ? content : ""}` : undefined}
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
