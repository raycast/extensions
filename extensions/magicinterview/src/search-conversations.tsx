import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  callTool,
  Conversation,
  ConversationPage,
  conversationUrl,
} from "./magicinterview";
import CreateConversation from "./create-conversation";

export default function SearchConversations() {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [requestVersion, setRequestVersion] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const request = ++generation.current;
    setLoading(true);
    setError(undefined);
    callTool<ConversationPage>("list_conversations", {
      query,
      offset,
      limit: 25,
    })
      .then((page) => {
        if (request !== generation.current) return;
        setItems((previous) =>
          offset ? [...previous, ...page.conversations] : page.conversations,
        );
        setNextOffset(page.hasNextPage ? page.nextOffset : null);
      })
      .catch((caught: unknown) => {
        if (request !== generation.current) return;
        const message =
          caught instanceof Error ? caught.message : "Please try again.";
        setError(message);
        void showToast({
          style: Toast.Style.Failure,
          title: "Could Not Load Conversations",
          message,
        });
      })
      .finally(() => {
        if (request === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [query, offset, requestVersion]);

  function refreshConversations() {
    setItems([]);
    setOffset(0);
    setNextOffset(null);
    setRequestVersion((previous) => previous + 1);
  }

  const retryAction = error && (
    <Action
      title="Retry Loading Conversations"
      icon={Icon.ArrowClockwise}
      onAction={() => setRequestVersion((previous) => previous + 1)}
    />
  );

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search by title, role, or company"
      onSearchTextChange={(text) => {
        setItems([]);
        setOffset(0);
        setNextOffset(null);
        setQuery(text);
      }}
      throttle
      pagination={{
        pageSize: 25,
        hasMore: nextOffset !== null,
        onLoadMore: () => {
          if (!loading && nextOffset !== null) setOffset(nextOffset);
        },
      }}
    >
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title={error ? "Connection Unavailable" : "No Conversations"}
        description={
          error ||
          "Create a conversation to prepare your next interview or meeting."
        }
        actions={
          <ActionPanel>
            {retryAction}
            <Action.Push
              title="Create Conversation"
              target={<CreateConversation onCreated={refreshConversations} />}
            />
          </ActionPanel>
        }
      />
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.SpeechBubble}
          title={item.title}
          subtitle={[item.company, item.role].filter(Boolean).join(" · ")}
          accessories={[{ text: item.projectTitle || item.purpose }]}
          actions={
            <ActionPanel>
              {retryAction}
              <Action.OpenInBrowser
                title="Open Conversation"
                url={conversationUrl(item)}
              />
              <Action.CopyToClipboard
                title="Copy Conversation Link"
                content={conversationUrl(item)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.Push
                title="Create Conversation"
                target={<CreateConversation onCreated={refreshConversations} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
