import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Conversation, getConversations, NextcloudError, sendMessage } from "./nextcloud";

const LAST_CONVERSATION_KEY = "last-conversation-token";

type FormValues = {
  conversation: string;
  message: string;
};

function conversationIcon(type: number): { source: Icon; tintColor?: string } {
  switch (type) {
    case 1:
      return { source: Icon.Person };
    case 2:
    case 3:
      return { source: Icon.TwoPeople };
    default:
      return { source: Icon.SpeechBubble };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof NextcloudError || error instanceof Error) return error.message;
  return "Something went wrong while contacting Nextcloud.";
}

export default function SendMessageCommand() {
  const preferences = getPreferenceValues<Preferences.SendMessage>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  async function loadConversations(signal?: AbortSignal) {
    setIsLoading(true);
    setLoadError(undefined);

    try {
      const [items, previousToken] = await Promise.all([
        getConversations(preferences, signal),
        LocalStorage.getItem<string>(LAST_CONVERSATION_KEY),
      ]);
      if (signal?.aborted) return;

      setConversations(items);
      setSelectedToken((current) => {
        if (items.some((item) => item.token === current)) return current;
        if (previousToken && items.some((item) => item.token === previousToken)) return previousToken;
        return items[0]?.token ?? "";
      });
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(errorMessage(error));
      setConversations([]);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadConversations(controller.signal);
    return () => controller.abort();
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.token === selectedToken),
    [conversations, selectedToken],
  );

  async function handleSubmit(values: FormValues) {
    const text = values.message.trim();
    if (!values.conversation) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a conversation" });
      return;
    }
    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "Write a message first" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending message…" });
    try {
      await sendMessage(preferences, values.conversation, text);
      await LocalStorage.setItem(LAST_CONVERSATION_KEY, values.conversation);
      toast.style = Toast.Style.Success;
      toast.title = "Message sent";
      toast.message = selectedConversation?.displayName;
      setMessage("");
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn’t send message";
      toast.message = errorMessage(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Send Nextcloud Talk Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={handleSubmit} />
          <Action
            title="Refresh Conversations"
            icon={Icon.ArrowClockwise}
            onAction={() => loadConversations()}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="conversation"
        title="To"
        placeholder={isLoading ? "Loading conversations…" : "Choose a user or room"}
        value={selectedToken}
        onChange={setSelectedToken}
        error={loadError}
      >
        {conversations.map((conversation) => (
          <Form.Dropdown.Item
            key={conversation.token}
            value={conversation.token}
            title={`${conversation.isFavorite ? "★ " : ""}${conversation.displayName}`}
            icon={conversationIcon(conversation.type)}
          />
        ))}
      </Form.Dropdown>
      {loadError ? (
        <Form.Description title="Connection Error" text={`${loadError} Press ⌘R to try again.`} />
      ) : conversations.length === 0 && !isLoading ? (
        <Form.Description title="Conversations" text="No Nextcloud Talk conversations were found for this account." />
      ) : null}
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Type a message"
        value={message}
        onChange={setMessage}
        enableMarkdown={false}
        autoFocus
      />
      {selectedConversation?.description ? (
        <Form.Description title="About" text={selectedConversation.description} />
      ) : null}
    </Form>
  );
}
