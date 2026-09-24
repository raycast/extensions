import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CodexAppServer } from "./codex";
import {
  asString,
  conversationTitle,
  filterSessions,
  messageOf,
  transcript,
  type StoredConversation,
} from "./conversations";

export type Page = "chat" | "history" | "archived" | "cli";

function RenameSession({
  session,
  onSave,
}: {
  session: StoredConversation;
  onSave: (session: StoredConversation) => void;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(conversationTitle(session));
  return (
    <Form
      navigationTitle="重命名会话"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="保存名称"
            onSubmit={() => {
              if (!title.trim()) return;
              onSave({ ...session, title: title.trim() });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="会话名称"
        value={title}
        onChange={setTitle}
        error={title.trim() ? undefined : "请输入名称"}
        autoFocus
      />
      <Form.Description text="仅修改本插件显示的名称，不修改 Codex CLI 中的原始记录。" />
    </Form>
  );
}

export function useSessionHistory({
  page,
  sessions,
  activeId,
  client,
  ready,
  accessory,
  onSelect,
  onUpdate,
  onBack,
  onNew,
}: {
  page: Page;
  sessions: StoredConversation[];
  activeId: string | null;
  client: CodexAppServer | null;
  ready: boolean;
  accessory: List.Props["searchBarAccessory"];
  onSelect: (session: StoredConversation) => Promise<void>;
  onUpdate: (session: StoredConversation) => void;
  onBack: () => void;
  onNew: () => Promise<void>;
}): List.Props {
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<StoredConversation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const loadingRef = useRef(false);
  const openingRef = useRef(false);

  async function load(nextCursor?: string, version = generation.current) {
    if (!client || !ready) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await client.listThreads(nextCursor, query.trim());
      if (version !== generation.current) return;
      const incoming: StoredConversation[] = result.data
        .map((thread) => ({
          threadId: asString(thread.id),
          title:
            asString(thread.name) ||
            asString(thread.preview) ||
            "未命名 Codex 会话",
          cwd: asString(thread.cwd),
          updatedAt:
            typeof thread.updatedAt === "number" ? thread.updatedAt * 1000 : 0,
          messages: [],
        }))
        .filter((thread) => thread.threadId);
      setRemote((previous) => {
        const combined = nextCursor ? [...previous, ...incoming] : incoming;
        return [
          ...new Map(
            combined.map((session) => [session.threadId, session]),
          ).values(),
        ];
      });
      setCursor(result.nextCursor);
    } catch (reason) {
      if (version === generation.current) setError(messageOf(reason));
    } finally {
      if (version === generation.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }

  useEffect(() => {
    const version = ++generation.current;
    loadingRef.current = false;
    setRemote([]);
    setCursor(null);
    setError("");
    setLoading(page === "cli" && ready);
    const timer = setTimeout(() => {
      if (page === "cli") void load(undefined, version);
    }, 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [page, query, ready, refresh, client]);

  const listed =
    page === "chat"
      ? []
      : page === "cli"
        ? remote
        : filterSessions(
            sessions.filter(
              (session) =>
                session.messages.length || session.draft || session.title,
            ),
            query,
            page === "archived",
          );
  async function select(session: StoredConversation) {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    try {
      await onSelect(session);
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  }
  const commonActions = (
    <>
      <Action title="返回聊天" icon={Icon.ArrowLeft} onAction={onBack} />
      <Action title="新建对话" icon={Icon.Plus} onAction={onNew} />
      {page === "cli" && (
        <Action
          title="刷新会话"
          icon={Icon.ArrowClockwise}
          onAction={() => setRefresh((value) => value + 1)}
        />
      )}
    </>
  );
  return {
    navigationTitle:
      page === "cli"
        ? "本机 Codex 会话"
        : page === "archived"
          ? "已归档会话"
          : "历史会话",
    searchBarAccessory: accessory,
    selectedItemId: undefined,
    searchText: query,
    onSearchTextChange: setQuery,
    filtering: false,
    searchBarPlaceholder:
      page === "cli" ? "搜索本机 Codex 会话标题…" : "搜索会话名称或聊天内容…",
    isLoading: loading || opening,
    isShowingDetail: page !== "cli" && listed.length > 0,
    pagination:
      page === "cli"
        ? {
            hasMore: Boolean(cursor),
            pageSize: 30,
            onLoadMore: () => {
              if (cursor && !loadingRef.current) void load(cursor);
            },
          }
        : undefined,
    actions: <ActionPanel>{commonActions}</ActionPanel>,
    children: (
      <>
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.Clock}
          title={
            error
              ? "暂时无法读取会话"
              : loading
                ? "正在读取会话…"
                : page === "cli" && !ready
                  ? "Codex 尚未连接"
                  : "没有匹配的会话"
          }
          description={
            error ||
            (page === "archived"
              ? "归档只隐藏插件列表，不会删除 Codex 记录。"
              : "可以返回聊天继续输入，或新建一个对话。")
          }
        />
        {listed.map((session) => (
          <List.Item
            key={session.threadId}
            id={session.threadId || undefined}
            title={conversationTitle(session)}
            icon={session.threadId === activeId ? Icon.Message : Icon.Clock}
            subtitle={page === "cli" ? session.cwd : undefined}
            accessories={
              page === "cli" && session.updatedAt
                ? [{ date: new Date(session.updatedAt) }]
                : undefined
            }
            detail={
              page !== "cli" ? (
                <List.Item.Detail markdown={transcript(session.messages)} />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={
                    opening
                      ? "正在打开…"
                      : session.archived
                        ? "恢复并继续聊天"
                        : "继续此会话"
                  }
                  icon={Icon.Message}
                  onAction={() => select(session)}
                />
                {page !== "cli" && (
                  <Action.Push
                    title="展开阅读"
                    icon={Icon.AppWindow}
                    target={
                      <Detail
                        navigationTitle={conversationTitle(session)}
                        markdown={transcript(session.messages)}
                      />
                    }
                  />
                )}
                {page !== "cli" && (
                  <Action.Push
                    title="重命名"
                    icon={Icon.Pencil}
                    target={
                      <RenameSession session={session} onSave={onUpdate} />
                    }
                  />
                )}
                {page !== "cli" && (
                  <Action
                    title={session.archived ? "取消归档" : "归档（仅本插件）"}
                    icon={Icon.Tray}
                    onAction={async () => {
                      if (session.threadId === activeId && !session.archived) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "请先切换到另一个会话",
                          message: "当前聊天不会被归档，以免中断回答。",
                        });
                        return;
                      }
                      onUpdate({ ...session, archived: !session.archived });
                    }}
                  />
                )}
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </>
    ),
  };
}
