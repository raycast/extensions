import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot } from "./core/client";
import { HistoryStore, replyThreads, transcriptMarkdown } from "./core/history";
import { client } from "./session";
import { botIcon } from "./bot-icon";
import { sessionMessages } from "./core/native-chat";

export const historyStore = new HistoryStore(client);

export function SessionReader(props: ConversationViews): React.JSX.Element {
  const { bot, renderComposer, renderMessages } = props;
  const [openedAt] = useState(() => Date.now());
  const initialIds = useRef<Set<string> | undefined>(undefined);
  const current = useHistory(bot.id);
  const { push } = useNavigation();
  if (current.snapshot.loaded && !initialIds.current) {
    initialIds.current = new Set(
      current.snapshot.entries.map((entry) => entry.id),
    );
  }
  const entries = initialIds.current
    ? sessionMessages(current.snapshot.entries, openedAt, initialIds.current)
    : [];
  const markdown = entries.length
    ? transcriptMarkdown(entries, bot.name, "Current Session")
    : `# Current Session\n\nStart a conversation with **${bot.name.replace(/[\\*_[\]`]/g, "")}**. Only messages from this visit appear here. Your previous conversations remain saved with the bot.`;
  return (
    <Detail
      navigationTitle={`${bot.name} · Current Session`}
      isLoading={current.loading}
      markdown={`${current.snapshot.error ? "> Could not refresh this session. Use Refresh Session to retry.\n\n" : ""}${markdown}`}
      actions={
        <ActionPanel>
          <Action
            title="Write Message"
            icon={Icon.Pencil}
            onAction={() =>
              push(renderComposer(undefined, () => void current.refresh()))
            }
          />
          <Action
            title="Refresh Session"
            icon={Icon.ArrowClockwise}
            onAction={current.refresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action
            title="Browse Previous History"
            icon={Icon.List}
            onAction={() => push(renderMessages())}
          />
          <Action.CopyToClipboard
            title="Copy Session as Markdown"
            content={markdown}
          />
        </ActionPanel>
      }
    />
  );
}
interface ConversationViews {
  bot: Bot;
  renderComposer: (
    rootId: string | undefined,
    sent: () => void,
  ) => React.JSX.Element;
  renderMessages: (rootId?: string) => React.JSX.Element;
}

export function useHistory(
  botId: string,
  rootId?: string,
  poll = true,
): {
  snapshot: ReturnType<HistoryStore["read"]>;
  loading: boolean;
  refresh: () => Promise<void>;
  loadOlder: () => Promise<void>;
} {
  const [snapshot, setSnapshot] = useState(() =>
    historyStore.read(botId, rootId),
  );
  const [loading, setLoading] = useState(!snapshot.loaded);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setSnapshot(historyStore.read(botId, rootId));
    setLoading(!historyStore.read(botId, rootId).loaded);
    const unsubscribe = historyStore.subscribe(botId, rootId, () => {
      if (active) setSnapshot(historyStore.read(botId, rootId));
    });
    async function update(): Promise<void> {
      await historyStore.load(botId, rootId);
      if (!active) return;
      setLoading(false);
      if (poll) timer = setTimeout(() => void update(), 4000);
    }
    void update();
    return () => {
      active = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, [botId, rootId, poll]);
  const refresh = useCallback(
    () => historyStore.load(botId, rootId),
    [botId, rootId],
  );
  const loadOlder = useCallback(
    () => historyStore.load(botId, rootId, true),
    [botId, rootId],
  );
  return {
    snapshot: historyStore.read(botId, rootId),
    loading,
    refresh,
    loadOlder,
  };
}

export function ThreadBrowser(props: ConversationViews): React.JSX.Element {
  const { bot, renderComposer } = props;
  const [selected, setSelected] = useState("main");
  const main = useHistory(bot.id, undefined, false);
  const rootId =
    selected === "main" || selected === "earlier" ? undefined : selected;
  const current = useHistory(bot.id, rootId);
  const threads = useMemo(
    () => replyThreads(main.snapshot.entries),
    [main.snapshot.entries],
  );
  const { push } = useNavigation();
  const title = rootId
    ? (threads.find((thread) => thread.rootId === rootId)?.title ??
      "Reply Thread")
    : "Main Conversation";
  const markdown = useMemo(
    () =>
      `${current.snapshot.entries.length > 12 ? "*Recent messages · Open Chat History for the full loaded transcript.*\n\n" : ""}${transcriptMarkdown(current.snapshot.entries.slice(-12), bot.name, title)}`,
    [current.snapshot.entries, bot.name, title],
  );
  function actions(
    selectedRoot?: string,
    selectedTitle = "Main Conversation",
  ): React.JSX.Element {
    return (
      <ActionPanel>
        <Action
          title="Open Chat History"
          icon={Icon.Message}
          onAction={() =>
            push(
              <ThreadReader
                {...props}
                rootId={selectedRoot}
                title={selectedTitle}
              />,
            )
          }
        />
        <Action
          title={selectedRoot ? "Reply in Thread" : "Write Message"}
          icon={Icon.Pencil}
          onAction={() =>
            push(renderComposer(selectedRoot, () => void current.refresh()))
          }
          shortcut={Keyboard.Shortcut.Common.New}
        />
        <Action
          title="Message Actions"
          icon={Icon.List}
          onAction={() => push(props.renderMessages(selectedRoot))}
        />
        {main.snapshot.before !== undefined && (
          <Action
            title="Load Earlier History and Threads"
            icon={Icon.ArrowUp}
            onAction={main.loadOlder}
          />
        )}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            await main.refresh();
            if (rootId) await current.refresh();
          }}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
      </ActionPanel>
    );
  }
  const detail = (
    <List.Item.Detail
      markdown={
        current.snapshot.error
          ? `> Couldn’t refresh: ${current.snapshot.error}\n\n${markdown}`
          : current.loading
            ? "Loading conversation…"
            : markdown
      }
    />
  );
  return (
    <List
      isLoading={main.loading || current.loading}
      isShowingDetail
      navigationTitle={`${bot.name} · Threads`}
      searchBarPlaceholder="Find a thread…"
      selectedItemId={selected}
      onSelectionChange={(id) => {
        if (id) setSelected(id);
      }}
    >
      <List.Section
        title={bot.name}
        subtitle={`${main.snapshot.entries.length} messages loaded`}
      >
        <List.Item
          id="main"
          title="Main Conversation"
          icon={botIcon(bot)}
          accessories={[{ text: bot.isRunning ? "Working" : "Chat history" }]}
          detail={detail}
          actions={actions()}
        />
      </List.Section>
      <List.Section
        title="Reply Threads"
        subtitle={
          threads.length
            ? `${threads.length} loaded`
            : "Reply to a message to start a thread"
        }
      >
        {threads.map((thread) => (
          <List.Item
            key={thread.rootId}
            id={thread.rootId}
            title={thread.title}
            icon={Icon.Message}
            accessories={[{ text: `${thread.replyCount} replies` }]}
            detail={detail}
            actions={actions(thread.rootId, thread.title)}
          />
        ))}
      </List.Section>
      {main.snapshot.before !== undefined && (
        <List.Item
          id="earlier"
          title="Load Earlier History"
          subtitle="Keep the current history and add older conversations"
          icon={Icon.ArrowUp}
          detail={
            <List.Item.Detail markdown="Load earlier messages to discover older reply threads. Your loaded history is retained." />
          }
          actions={
            <ActionPanel>
              <Action title="Load Earlier History" onAction={main.loadOlder} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export function ThreadReader({
  rootId,
  renderMessages,
}: ConversationViews & { rootId?: string; title: string }): React.JSX.Element {
  return renderMessages(rootId);
}
