import {
  Action,
  ActionPanel,
  Form,
  List,
  getPreferenceValues,
  Icon,
  Keyboard,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { CodexAppServer, type CodexEvent } from "./codex";
import { useSessionHistory, type Page } from "./history";
import {
  asRecord,
  asString,
  messageOf,
  makeId,
  emptyConversation,
  parseLibrary,
  upsertConversation,
  conversationTitle,
  latestRound,
  messagesFromThread,
  transcript,
  LIBRARY_KEY,
  LEGACY_KEY,
  type ChatMessage,
  type StoredConversation,
  type ConversationLibrary,
} from "./conversations";

export default function AskCodex(
  props: LaunchProps<{
    arguments: Arguments.Index;
    launchContext?: { page?: Page };
  }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const initialPrompt =
    props.fallbackText?.trim() || props.arguments?.prompt?.trim() || "";
  const [conversation, setConversation] =
    useState<StoredConversation>(emptyConversation);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("正在连接 Codex…");
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page>(
    props.launchContext?.page === "history" ? "history" : "chat",
  );
  const [sessions, setSessions] = useState<StoredConversation[]>([]);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [switching, setSwitching] = useState(false);
  const libraryRef = useRef<ConversationLibrary>({
    version: 2,
    activeId: null,
    sessions: [],
  });
  const storageReadyRef = useRef(false);
  const clientRef = useRef<CodexAppServer | null>(null);
  const readyRef = useRef(false);
  const mountedRef = useRef(true);
  const initialSentRef = useRef(false);
  const initRef = useRef<Promise<void>>(Promise.resolve());
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const requestPendingRef = useRef(false);
  const activeReplyRef = useRef<string | null>(null);
  const itemIdsRef = useRef(new Map<string, string>());
  const persistedRef = useRef<StoredConversation | null>(null);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  // Keep the latest snapshot synchronously, including just-typed text on exit.
  if (conversation.threadId)
    persistedRef.current = {
      ...conversation,
      draft,
      updatedAt:
        persistedRef.current?.threadId === conversation.threadId
          ? persistedRef.current.updatedAt
          : conversation.updatedAt,
    };

  function persistLibrary() {
    if (!storageReadyRef.current) return;
    const encoded = JSON.stringify(libraryRef.current);
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => LocalStorage.setItem(LIBRARY_KEY, encoded));
    void saveQueueRef.current.catch((reason) => {
      if (mountedRef.current) setError(`会话保存失败：${messageOf(reason)}`);
    });
  }

  function save(value: StoredConversation, activate = true) {
    if (!storageReadyRef.current) return;
    // Codex does not persist a rollout until the first message. Do not make
    // an untouched, unresumable thread the saved active session.
    if (!value.messages.length && !value.draft && !value.title) {
      if (activate)
        libraryRef.current = { ...libraryRef.current, activeId: null };
      persistLibrary();
      return;
    }
    libraryRef.current = upsertConversation(
      libraryRef.current,
      value,
      activate,
    );
    if (mountedRef.current) setSessions(libraryRef.current.sessions);
    persistLibrary();
  }

  useEffect(() => {
    let disposed = false;
    mountedRef.current = true;
    readyRef.current = false;
    setReady(false);
    setError("");
    setStatus("正在连接 Codex…");
    const handleEvent = (event: CodexEvent) => {
      if (disposed) return;
      const params = event.params;
      if (
        params.threadId &&
        client.currentThreadId &&
        params.threadId !== client.currentThreadId
      )
        return;
      if (event.method === "turn/started") {
        setBusy(true);
        setStatus("正在思考 · 可直接输入补充要求");
      }
      if (event.method === "item/started") {
        const type = asString(asRecord(params.item).type);
        if (type === "webSearch") setStatus("正在搜索网页 · 可继续补充要求");
        else if (type === "commandExecution")
          setStatus("正在运行命令 · 可停止或补充要求");
        else if (type === "mcpToolCall")
          setStatus("正在调用工具 · 可继续补充要求");
      }
      if (
        event.method === "item/agentMessage/delta" ||
        (event.method === "item/completed" &&
          asRecord(params.item).type === "agentMessage")
      ) {
        const item = asRecord(params.item);
        const itemId = asString(params.itemId) || asString(item.id);
        let replyId = itemIdsRef.current.get(itemId);
        if (!replyId) {
          replyId = activeReplyRef.current || makeId();
          activeReplyRef.current = null;
          itemIdsRef.current.set(itemId, replyId);
        }
        const completed = event.method === "item/completed";
        const text = completed ? asString(item.text) : asString(params.delta);
        const id = replyId;
        setConversation((previous) => {
          const existing = previous.messages.find(
            (message) => message.id === id,
          );
          const next: ChatMessage = {
            id,
            role: "assistant",
            content: completed
              ? text || existing?.content || ""
              : (existing?.content || "") + text,
            status: completed ? "complete" : "streaming",
          };
          return {
            ...previous,
            messages: existing
              ? previous.messages.map((message) =>
                  message.id === id ? next : message,
                )
              : [...previous.messages, next],
          };
        });
        setStatus("正在回答 · 可直接输入补充要求");
      }
      if (event.method === "turn/completed") {
        const turn = asRecord(params.turn);
        setBusy(false);
        const failure = asString(asRecord(turn.error).message);
        if (failure) setError(failure);
        setStatus(
          turn.status === "failed"
            ? "本次回答失败，可重试"
            : turn.status === "interrupted"
              ? "已停止 · 输入后回车继续"
              : "已完成 · 输入后按 Enter 继续",
        );
        setConversation((previous) => ({
          ...previous,
          messages: previous.messages.map((message) =>
            message.status === "streaming"
              ? { ...message, status: "complete" }
              : message,
          ),
        }));
      }
      if (event.method === "error") {
        setError(
          asString(asRecord(params.error).message) ||
            asString(params.message) ||
            "Codex 返回错误",
        );
      }
      if (
        event.method.includes("requestApproval") ||
        event.method.includes("requestUserInput") ||
        event.method === "request/unsupported"
      ) {
        setError(
          "此操作需要交互式确认，当前界面未自动授权。请停止本轮，在 Codex CLI 中继续此会话。",
        );
      }
      if (event.method === "process/exited") {
        readyRef.current = false;
        setReady(false);
        setBusy(false);
        setError(
          asString(params.stderr) || "Codex 连接已关闭，请使用“重新连接”。",
        );
        setStatus("连接已关闭");
      }
    };
    const client = new CodexAppServer({
      onEvent: handleEvent,
      sandbox: preferences.sandboxMode || "read-only",
      cwd: preferences.workingDirectory,
      codexPath: preferences.codexPath,
      liveSearch: preferences.liveSearch ?? true,
    });
    clientRef.current = client;
    const initialize = async () => {
      await saveQueueRef.current.catch(() => undefined);
      const library = parseLibrary(
        await LocalStorage.getItem<string>(LIBRARY_KEY),
        await LocalStorage.getItem<string>(LEGACY_KEY),
      );
      if (disposed) return;
      libraryRef.current = library;
      storageReadyRef.current = true;
      setSessions(library.sessions);
      const stored =
        library.sessions.find(
          (session) => session.threadId === library.activeId,
        ) || emptyConversation();
      setConversation(stored);
      setDraft(stored.draft || "");
      await client.connect();
      if (disposed) {
        client.close();
        return;
      }
      let threadId: string;
      let messages: ChatMessage[] = stored.messages.map((message) => ({
        ...message,
        status: "complete" as const,
      }));
      if (stored.threadId) {
        try {
          threadId = await client.resumeThread(stored.threadId);
          const recovered = messagesFromThread(client.threadSnapshot);
          if (recovered.length) messages = recovered;
        } catch (reason) {
          // Keep the saved session intact in history if its server record is unavailable.
          if (stored.threadId) save(stored, false);
          threadId = await client.startThread();
          messages = [];
          if (stored.messages.length)
            setError(
              `之前的会话暂时无法恢复，已保留在历史中：${messageOf(reason)}`,
            );
        }
      } else {
        threadId = await client.startThread();
      }
      if (disposed) {
        client.close();
        return;
      }
      setConversation({
        ...(threadId === stored.threadId ? stored : {}),
        threadId,
        messages,
        cwd: asString(client.threadSnapshot.cwd),
        archived: false,
      });
      // Unsent drafts survive an empty, not-yet-persisted server thread.
      if (threadId !== stored.threadId && stored.messages.length) setDraft("");
      setBusy(Boolean(client.currentTurnId));
      readyRef.current = true;
      setReady(true);
      setStatus("已连接 · 输入后按 Enter 发送");
    };
    initRef.current = initialize();
    void initRef.current.catch((reason: unknown) => {
      if (!disposed) {
        setError(messageOf(reason));
        setStatus("连接失败");
      }
    });
    return () => {
      disposed = true;
      mountedRef.current = false;
      readyRef.current = false;
      if (persistedRef.current) save(persistedRef.current);
      client.close();
    };
  }, [
    preferences.codexPath,
    preferences.workingDirectory,
    preferences.sandboxMode,
    preferences.liveSearch,
    connectionAttempt,
  ]);

  useEffect(() => {
    if (!conversation.threadId) return;
    const snapshot = { ...conversation, draft, updatedAt: Date.now() };
    persistedRef.current = snapshot;
    const timer = setTimeout(() => save(snapshot), 350);
    return () => clearTimeout(timer);
  }, [conversation, draft]);

  async function deliver(prompt: string) {
    await initRef.current;
    if (!mountedRef.current) return;
    const client = clientRef.current;
    if (!client || !readyRef.current)
      throw new Error("Codex 尚未连接，请重新打开命令。");
    setError("");
    if (client.currentTurnId) {
      try {
        await client.steer(prompt);
        if (!mountedRef.current) return;
        setConversation((previous) => ({
          ...previous,
          messages: [
            ...previous.messages,
            {
              id: makeId(),
              role: "user",
              content: prompt,
              kind: "steer",
              status: "complete",
            },
          ],
        }));
        setStatus("已发送补充要求");
        return;
      } catch (reason) {
        // The turn may complete between pressing Enter and the steer RPC.
        // Only retry as a follow-up when there is no active turn anymore.
        if (client.currentTurnId) throw reason;
      }
    }
    const userId = makeId();
    const replyId = makeId();
    activeReplyRef.current = replyId;
    itemIdsRef.current.clear();
    setBusy(true);
    setStatus("正在思考 · 可直接输入补充要求");
    setConversation((previous) => ({
      ...previous,
      messages: [
        ...previous.messages,
        {
          id: userId,
          role: "user",
          content: prompt,
          kind: "message",
          status: "complete",
        },
        { id: replyId, role: "assistant", content: "", status: "streaming" },
      ],
    }));
    try {
      await client.startTurn(prompt);
    } catch (reason) {
      setBusy(false);
      setConversation((previous) => ({
        ...previous,
        messages: previous.messages.filter(
          (message) => message.id !== userId && message.id !== replyId,
        ),
      }));
      throw reason;
    }
  }

  function enqueue(prompt: string) {
    // Serialize start/steer acknowledgements, not the whole answer.
    const next = sendQueueRef.current.then(() => deliver(prompt));
    sendQueueRef.current = next.catch(() => undefined);
    return next;
  }

  async function reportFailure(reason: unknown, prompt: string) {
    if (!mountedRef.current) return;
    const message = messageOf(reason);
    setError(message);
    setDraft((current) => current || prompt);
    await showToast({
      style: Toast.Style.Failure,
      title: "未发送成功",
      message,
    });
  }

  useEffect(() => {
    if (!ready || !initialPrompt || initialSentRef.current) return;
    initialSentRef.current = true;
    setDraft((current) => (current.trim() === initialPrompt ? "" : current));
    void enqueue(initialPrompt).catch((reason: unknown) =>
      reportFailure(reason, initialPrompt),
    );
  }, [ready, initialPrompt]);

  async function sendPrompt(prompt: string): Promise<boolean> {
    const text = prompt.trim();
    if (!text || requestPendingRef.current || switching) return false;
    if (!readyRef.current) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Codex 尚未连接",
        message: "文字已保留，请等待连接或点击“重新连接”。",
      });
      return false;
    }
    requestPendingRef.current = true;
    setDraft("");
    try {
      await enqueue(text);
      return true;
    } catch (reason) {
      await reportFailure(reason, text);
      return false;
    } finally {
      requestPendingRef.current = false;
    }
  }

  async function newChat() {
    if (busy || requestPendingRef.current || switching) {
      await showToast({
        style: Toast.Style.Failure,
        title: "请先停止当前回答",
      });
      return;
    }
    requestPendingRef.current = true;
    setSwitching(true);
    try {
      await initRef.current;
      const client = clientRef.current;
      if (!client || !readyRef.current) throw new Error("Codex 尚未连接");
      if (persistedRef.current) save(persistedRef.current);
      const threadId = await client.startThread();
      const next = {
        threadId,
        messages: [],
        cwd: asString(client.threadSnapshot.cwd),
        updatedAt: Date.now(),
      };
      persistedRef.current = next;
      setConversation(next);
      setDraft("");
      save(next);
      setPage("chat");
      activeReplyRef.current = null;
      itemIdsRef.current.clear();
      setError("");
      setStatus("新对话 · 输入后按 Enter 发送");
    } catch (reason) {
      await reportFailure(reason, "");
    } finally {
      requestPendingRef.current = false;
      setSwitching(false);
    }
  }

  async function resumeSession(session: StoredConversation) {
    if (session.threadId === conversation.threadId) {
      setPage("chat");
      return;
    }
    if (busy || requestPendingRef.current || switching) {
      await showToast({
        style: Toast.Style.Failure,
        title: "请先停止当前回答",
        message: "停止后即可切换会话。",
      });
      return;
    }
    requestPendingRef.current = true;
    setSwitching(true);
    try {
      await initRef.current;
      const client = clientRef.current;
      if (!client || !readyRef.current || !session.threadId)
        throw new Error("Codex 尚未连接，请返回聊天重新连接。");
      if (persistedRef.current) save(persistedRef.current);
      const threadId = await client.resumeThread(session.threadId);
      const existing = libraryRef.current.sessions.find(
        (item) => item.threadId === threadId,
      );
      const hydrated = messagesFromThread(client.threadSnapshot);
      const next: StoredConversation = {
        ...session,
        ...existing,
        threadId,
        archived: false,
        updatedAt: Date.now(),
        messages: hydrated.length
          ? hydrated
          : existing?.messages || session.messages,
        cwd: asString(client.threadSnapshot.cwd),
      };
      activeReplyRef.current = null;
      itemIdsRef.current.clear();
      persistedRef.current = next;
      setConversation(next);
      setDraft(next.draft || "");
      setBusy(Boolean(client.currentTurnId));
      setError("");
      setStatus("会话已恢复 · 可继续输入");
      save(next);
      setPage("chat");
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未能打开会话",
        message: messageOf(reason),
      });
    } finally {
      requestPendingRef.current = false;
      setSwitching(false);
    }
  }

  function updateSession(session: StoredConversation) {
    if (session.threadId === conversation.threadId) {
      // Rename must not replace newer streaming text with an old form snapshot.
      const next = {
        ...(persistedRef.current || conversation),
        title: session.title,
        archived: session.archived,
      };
      setConversation(next);
      save(next);
    } else save(session, false);
  }

  function changePage(value: string) {
    if (switching) return;
    if (value === "new") {
      void newChat();
      return;
    }
    if (persistedRef.current)
      save({ ...persistedRef.current, draft: draftRef.current });
    setPage(value as Page);
  }

  function reconnect() {
    if (readyRef.current || switching) return;
    if (persistedRef.current) save(persistedRef.current);
    setError("");
    setConnectionAttempt((value) => value + 1);
  }

  const currentMessages = useMemo(
    () => latestRound(conversation.messages),
    [conversation.messages],
  );
  const answer =
    currentMessages
      .filter((message) => message.role === "assistant")
      .map((message) => message.content)
      .filter(Boolean)
      .join("\n\n") || "";

  const codexNotFound =
    error.includes("未找到 Codex CLI") || error.includes("找不到指定的 Codex");
  const secondaryActions = (
    <>
      {codexNotFound && (
        <Action.OpenInBrowser
          title="安装 Codex CLI"
          icon={Icon.Download}
          url="https://github.com/openai/codex#installation"
        />
      )}
      {busy && (
        <Action
          title="停止回答"
          icon={Icon.Stop}
          onAction={async () => {
            try {
              await clientRef.current?.interrupt();
              setStatus("正在停止…");
            } catch (reason) {
              await reportFailure(reason, "");
            }
          }}
        />
      )}
      <Action
        title="历史会话"
        icon={Icon.Clock}
        shortcut={{
          modifiers: [process.platform === "darwin" ? "cmd" : "ctrl", "shift"],
          key: "h",
        }}
        onAction={() => changePage("history")}
      />
      {answer && <Action.CopyToClipboard title="复制回答" content={answer} />}
      <Action.CopyToClipboard
        title="复制当前对话"
        content={transcript(conversation.messages)}
      />
      <Action
        title="新建对话"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={newChat}
      />
      <Action
        title="打开设置"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </>
  );
  const historyLink = `raycast://extensions/bbfss/ask-codex-raycast/index?context=${encodeURIComponent(JSON.stringify({ page: "history" }))}`;
  const chatTranscript = [
    ...(error ? [`提示：${error}`] : []),
    ...conversation.messages
      .filter((message) => message.content.trim())
      .map(
        (message) =>
          `${message.role === "user" ? "你" : "Codex"}${message.kind === "steer" ? " · 补充要求" : ""}\n${message.content}`,
      ),
    `状态：${status}`,
  ].join("\n\n");
  const accessory = (
    <List.Dropdown tooltip="聊天与会话管理" value={page} onChange={changePage}>
      <List.Dropdown.Item title="聊天" value="chat" icon={Icon.Message} />
      <List.Dropdown.Item title="历史会话" value="history" icon={Icon.Clock} />
      <List.Dropdown.Item title="已归档" value="archived" icon={Icon.Tray} />
      <List.Dropdown.Item
        title="本机 Codex 会话"
        value="cli"
        icon={Icon.Terminal}
      />
      <List.Dropdown.Item title="新建对话" value="new" icon={Icon.Plus} />
    </List.Dropdown>
  );
  const historyProps = useSessionHistory({
    page,
    sessions,
    activeId: conversation.threadId,
    client: clientRef.current,
    ready,
    accessory,
    onSelect: resumeSession,
    onUpdate: updateSession,
    onBack: () => changePage("chat"),
    onNew: newChat,
  });
  if (page === "chat") {
    return (
      <Form
        navigationTitle={conversationTitle(conversation)}
        searchBarAccessory={
          <Form.LinkAccessory target={historyLink} text="会话历史" />
        }
        actions={
          <ActionPanel>
            {!ready && error ? (
              <Action
                title="重新连接"
                icon={Icon.ArrowClockwise}
                onAction={reconnect}
              />
            ) : (
              <Action.SubmitForm
                title={busy ? "发送补充要求" : "发送消息"}
                icon={Icon.ArrowRight}
                onSubmit={(values) => {
                  void sendPrompt(asString(values.prompt) || draft);
                }}
              />
            )}
            {secondaryActions}
          </ActionPanel>
        }
      >
        <Form.TextField
          id="prompt"
          title="消息"
          value={draft}
          onChange={setDraft}
          placeholder={
            busy
              ? "继续输入补充要求，按 Enter 发送…"
              : "输入问题或追问，按 Enter 发送…"
          }
          autoFocus
        />
        <Form.Description text={chatTranscript} />
      </Form>
    );
  }
  return (
    <List
      navigationTitle="Ask ChatGPT (Codex)"
      searchBarAccessory={accessory}
      searchText={draft}
      onSearchTextChange={setDraft}
      searchBarPlaceholder={
        busy
          ? "继续输入补充要求，Enter 发送给正在回答的 Codex…"
          : "输入问题或追问，Enter 发送…"
      }
      filtering={false}
      throttle={false}
      isShowingDetail
      isLoading={(!ready && !error) || busy || switching}
      selectedItemId="current"
      {...historyProps}
    >
      {historyProps.children}
    </List>
  );
}
