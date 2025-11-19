import { List, showToast, Toast, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMessages } from "../api";
import { TempEmail, Message } from "../types";
import { formatMessageDate } from "../utils/formatters";
import { MessageView } from "./MessageView";
import { ERROR_MESSAGES, UI_STRINGS, API_RESPONSE } from "../constants";

interface MailboxViewProps {
  email: TempEmail;
}

export function MailboxView({ email }: MailboxViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadMessages() {
    setIsLoading(true);
    try {
      const response = await getMessages(email.token);
      setMessages(response[API_RESPONSE.HYDRA_MEMBER]);
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: ERROR_MESSAGES.MESSAGES_LOAD_FAILED,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.STANDARD_ERROR_MESSAGE,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle={email.address}>
      {messages.length === 0 ? (
        <List.EmptyView
          title={UI_STRINGS.NO_MESSAGES_TITLE}
          description={UI_STRINGS.NO_MESSAGES_DESCRIPTION}
          icon={Icon.Envelope}
        />
      ) : (
        messages.map((message) => (
          <List.Item
            key={message.id}
            id={message.id}
            title={message.subject || UI_STRINGS.NO_SUBJECT}
            subtitle={message.from.address}
            accessories={[
              { text: formatMessageDate(message.createdAt) },
              ...(!message.seen ? [{ icon: Icon.Circle, tooltip: UI_STRINGS.UNREAD_TOOLTIP }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={UI_STRINGS.VIEW_MESSAGE}
                  icon={Icon.Eye}
                  onAction={() => push(<MessageView messageId={message.id} token={email.token} />)}
                />
                <Action
                  title={UI_STRINGS.REFRESH}
                  icon={Icon.ArrowClockwise}
                  onAction={loadMessages}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
