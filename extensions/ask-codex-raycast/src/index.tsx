import { setLocale, t } from "./i18n";
import { SetupWizard } from "./setup";
import {
  connectionSignature,
  parseSetup,
  SETUP_KEY,
  type Setup,
} from "./setup-state";
import {
  Action,
  ActionPanel,
  Detail,
  environment,
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
import {
  CodexAppServer,
  type CodexEvent,
  type CodexModel,
  type ModelSelection,
} from "./codex";
import { useSessionHistory, type Page } from "./history";
import { conversationMarkdown } from "./chat-text";
import { ModelMenu, MODEL_SELECTION_KEY } from "./model-menu";
import { MessageComposer } from "./message-composer";
import {
  asRecord,
  asString,
  messageOf,
  makeId,
  emptyConversation,
  parseLibrary,
  upsertConversation,
  latestRound,
  messagesFromThread,
  reconnectedConversation,
  applyAssistantMessage,
  transcript,
  LIBRARY_KEY,
  LEGACY_KEY,
  type ChatMessage,
  type StoredConversation,
  type ConversationLibrary,
} from "./conversations";

export default function CodexInRaycast(
  props: LaunchProps<{ arguments: Arguments.Index }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const signature = connectionSignature(preferences);
  const launchConsumed = useRef(false);
  return (
    <ConfiguredCommand
      key={signature}
      launch={props}
      preferences={preferences}
      launchConsumed={launchConsumed}
    />
  );
}

function ConfiguredCommand({
  launch,
  preferences,
  launchConsumed,
}: {
  launch: LaunchProps<{ arguments: Arguments.Index }>;
  preferences: Preferences;
  launchConsumed: { current: boolean };
}) {
  const [loaded, setLoaded] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [savedSelection, setSavedSelection] = useState<ModelSelection | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError("");
      const saved = parseSetup(await LocalStorage.getItem<string>(SETUP_KEY));
      const rawSelection =
        await LocalStorage.getItem<string>(MODEL_SELECTION_KEY);
      let selection: ModelSelection | null = null;
      try {
        const parsed = JSON.parse(rawSelection || "null");
        if (
          typeof parsed?.model === "string" &&
          typeof parsed.effort === "string"
        )
          selection = parsed;
      } catch {
        /* Keep setup available if an old model preference is malformed. */
      }
      if (cancelled) return;
      setLocale(saved?.locale || "en");
      setSetup(saved);
      setSavedSelection(selection);
      setLoaded(true);
    }
    void load().catch((reason) => {
      if (!cancelled) setLoadError(messageOf(reason));
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  if (!loaded)
    return (
      <Detail
        isLoading={!loadError}
        markdown={loadError || ""}
        actions={
          loadError ? (
            <ActionPanel>
              <Action
                title={t("Retry")}
                onAction={() => setAttempt((value) => value + 1)}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  if (
    editing ||
    !setup ||
    setup.connection !== connectionSignature(preferences)
  )
    return (
      <SetupWizard
        preferences={preferences}
        previous={setup}
        selection={savedSelection}
        onComplete={(value) => {
          setLocale(value.locale);
          setSetup(value);
          setSavedSelection(value.selection);
          setEditing(false);
        }}
      />
    );
  return (
    <NativeChat
      {...(launchConsumed.current
        ? { ...launch, arguments: { prompt: "" }, fallbackText: "" }
        : launch)}
      onPromptConsumed={() => {
        launchConsumed.current = true;
      }}
      onConfigure={(selection) => {
        setSavedSelection(selection);
        setEditing(true);
      }}
    />
  );
}

function NativeChat(
  props: LaunchProps<{ arguments: Arguments.Index }> & {
    onConfigure: (selection: ModelSelection | null) => void;
    onPromptConsumed: () => void;
  },
) {
  const preferences = getPreferenceValues<Preferences>();
  const initialPrompt =
    props.fallbackText?.trim() || props.arguments?.prompt?.trim() || "";
  const [conversation, setConversation] =
    useState<StoredConversation>(emptyConversation);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(t("正在连接 Codex…"));
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page>("chat");
  const [sessions, setSessions] = useState<StoredConversation[]>([]);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [models, setModels] = useState<CodexModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [modelSelection, setModelSelection] = useState<ModelSelection | null>(
    null,
  );
  const [currentModel, setCurrentModel] = useState<ModelSelection>({
    model: "",
    effort: "",
  });
  const modelSelectionRef = useRef<ModelSelection | null>(null);
  const modelsRef = useRef<CodexModel[]>([]);
  const modelsRequestRef = useRef<Promise<CodexModel[]> | null>(null);
  const modelSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
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
      if (mountedRef.current)
        setError(t("会话保存失败：{v0}", { v0: messageOf(reason) }));
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

  async function refreshModels(): Promise<CodexModel[]> {
    const client = clientRef.current;
    if (!client || !readyRef.current) return [];
    if (modelsRequestRef.current) return modelsRequestRef.current;
    setModelsLoading(true);
    setModelsError("");
    const request = client.listModels();
    modelsRequestRef.current = request;
    try {
      const catalog = await request;
      if (mountedRef.current && clientRef.current === client) {
        modelsRef.current = catalog;
        setModels(catalog);
      }
      return catalog;
    } catch (reason) {
      if (mountedRef.current && clientRef.current === client)
        setModelsError(messageOf(reason));
      throw reason;
    } finally {
      if (modelsRequestRef.current === request) modelsRequestRef.current = null;
      if (mountedRef.current && clientRef.current === client)
        setModelsLoading(false);
    }
  }

  function selectModel(selection: ModelSelection | null) {
    modelSelectionRef.current = selection;
    setModelSelection(selection);
    modelSaveQueueRef.current = modelSaveQueueRef.current
      .catch(() => undefined)
      .then(() =>
        LocalStorage.setItem(MODEL_SELECTION_KEY, JSON.stringify(selection)),
      );
    void modelSaveQueueRef.current.catch((reason) =>
      showToast({
        style: Toast.Style.Failure,
        title: t("模型选择保存失败"),
        message: messageOf(reason),
      }),
    );
    void showToast({
      style: Toast.Style.Success,
      title: selection
        ? [selection.model, selection.effort].filter(Boolean).join(" · ")
        : t("沿用当前会话模型"),
      message: busy
        ? t("下一次回复使用；当前回答的补充要求仍使用原模型。")
        : t("下一条消息使用此设置。"),
    });
  }

  useEffect(() => {
    let disposed = false;
    mountedRef.current = true;
    readyRef.current = false;
    activeReplyRef.current = null;
    setReady(false);
    setError("");
    setStatus(t("正在连接 Codex…"));
    modelsRequestRef.current = null;
    modelsRef.current = [];
    setModels([]);
    setModelsLoading(false);
    setModelsError("");
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
        setStatus(t("正在思考 · 输入后按 Enter 发送补充要求"));
      }
      if (event.method === "item/started") {
        const type = asString(asRecord(params.item).type);
        if (type === "webSearch") setStatus(t("正在搜索网页 · 可继续补充要求"));
        else if (type === "commandExecution")
          setStatus(t("正在运行命令 · 可停止或补充要求"));
        else if (type === "mcpToolCall")
          setStatus(t("正在调用工具 · 可继续补充要求"));
      }
      if (
        event.method === "item/agentMessage/delta" ||
        (event.method === "item/completed" &&
          asRecord(params.item).type === "agentMessage")
      ) {
        const item = asRecord(params.item);
        const itemId = asString(params.itemId) || asString(item.id);
        const placeholderId = activeReplyRef.current;
        activeReplyRef.current = null;
        const completed = event.method === "item/completed";
        const text = completed ? asString(item.text) : asString(params.delta);
        setConversation((previous) => ({
          ...previous,
          messages: applyAssistantMessage(previous.messages, {
            itemId,
            placeholderId,
            text,
            completed,
          }),
        }));
        setStatus(t("正在回答 · 输入后按 Enter 发送补充要求"));
      }
      if (event.method === "turn/completed") {
        const turn = asRecord(params.turn);
        setBusy(false);
        const failure = asString(asRecord(turn.error).message);
        if (failure) setError(failure);
        setStatus(
          turn.status === "failed"
            ? t("本次回答失败，可重试")
            : turn.status === "interrupted"
              ? t("已停止 · 输入后按 Enter 继续聊天")
              : t("已完成 · 输入后按 Enter 继续聊天"),
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
            t("Codex 返回错误"),
        );
      }
      if (
        event.method.includes("requestApproval") ||
        event.method.includes("requestUserInput") ||
        event.method === "request/unsupported"
      ) {
        setError(
          t(
            "此操作需要交互式确认，当前界面未自动授权。请停止本轮，在 Codex CLI 中继续此会话。",
          ),
        );
      }
      if (event.method === "process/exited") {
        readyRef.current = false;
        setReady(false);
        setBusy(false);
        setError(
          asString(params.stderr) || t("Codex 连接已关闭，请使用“重新连接”。"),
        );
        setStatus(t("连接已关闭"));
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
      await modelSaveQueueRef.current.catch(() => undefined);
      const savedModel =
        await LocalStorage.getItem<string>(MODEL_SELECTION_KEY);
      let selection: ModelSelection | null = null;
      try {
        const saved = asRecord(savedModel ? JSON.parse(savedModel) : null);
        if (asString(saved.model))
          selection = {
            model: asString(saved.model),
            effort: asString(saved.effort),
          };
      } catch {
        /* A malformed picker preference must not prevent opening chat. */
      }
      if (disposed) return;
      modelSelectionRef.current = selection;
      setModelSelection(selection);
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
              t("之前的会话暂时无法恢复，已保留在历史中：{v0}", {
                v0: messageOf(reason),
              }),
            );
        }
      } else {
        threadId = await client.startThread();
      }
      if (disposed) {
        client.close();
        return;
      }
      const resumed = reconnectedConversation(
        stored,
        threadId,
        messages,
        asString(client.threadSnapshot.cwd),
        draftRef.current,
      );
      persistedRef.current = resumed;
      setConversation(resumed);
      setDraft(resumed.draft || "");
      save(resumed);
      setBusy(Boolean(client.currentTurnId));
      setCurrentModel(client.currentModelSelection);
      readyRef.current = true;
      setReady(true);
      setStatus(t("已连接 · 输入后按 Enter 发送"));
      void refreshModels().catch(() => undefined);
    };
    initRef.current = initialize();
    void initRef.current.catch((reason: unknown) => {
      if (!disposed) {
        setError(messageOf(reason));
        setStatus(t("连接失败"));
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

  async function deliver(prompt: string, selection: ModelSelection | null) {
    await initRef.current;
    if (!mountedRef.current) return;
    const client = clientRef.current;
    if (!client || !readyRef.current)
      throw new Error(t("服务尚未连接，请重新打开命令。"));
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
        setStatus(t("已发送补充要求"));
        return;
      } catch (reason) {
        // The turn may complete between pressing Enter and the steer RPC.
        // Only retry as a follow-up when there is no active turn anymore.
        if (client.currentTurnId) throw reason;
      }
    }
    if (selection) {
      const catalog = modelsRef.current.length
        ? modelsRef.current
        : await refreshModels();
      const model = catalog.find((item) => item.model === selection.model);
      if (
        !model ||
        (selection.effort && !model.efforts.includes(selection.effort))
      ) {
        throw new Error(
          t("所选模型或档位已不可用，请在底部 Actions 中重新选择模型。"),
        );
      }
    }
    const userId = makeId();
    const replyId = makeId();
    activeReplyRef.current = replyId;
    setBusy(true);
    setStatus(t("正在思考 · 输入后按 Enter 发送补充要求"));
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
      await client.startTurn(prompt, selection);
      if (mountedRef.current) setCurrentModel(client.currentModelSelection);
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
    const selection = modelSelectionRef.current
      ? { ...modelSelectionRef.current }
      : null;
    const next = sendQueueRef.current.then(() => deliver(prompt, selection));
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
      title: t("未发送成功"),
      message,
    });
  }

  useEffect(() => {
    if (!ready || !initialPrompt || initialSentRef.current) return;
    initialSentRef.current = true;
    props.onPromptConsumed();
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
        title: t("服务尚未连接"),
        message: t("文字已保留，请等待连接或点击“重新连接”。"),
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
        title: t("请先停止当前回答"),
      });
      return;
    }
    requestPendingRef.current = true;
    setSwitching(true);
    try {
      await initRef.current;
      const client = clientRef.current;
      if (!client || !readyRef.current) throw new Error(t("服务尚未连接"));
      if (persistedRef.current) save(persistedRef.current);
      const threadId = await client.startThread();
      setCurrentModel(client.currentModelSelection);
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
      setError("");
      setStatus(t("新对话 · 输入后按 Enter 发送"));
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
        title: t("请先停止当前回答"),
        message: t("停止后即可切换会话。"),
      });
      return;
    }
    requestPendingRef.current = true;
    setSwitching(true);
    try {
      await initRef.current;
      const client = clientRef.current;
      if (!client || !readyRef.current || !session.threadId)
        throw new Error(t("服务尚未连接，请返回聊天重新连接。"));
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
      persistedRef.current = next;
      setConversation(next);
      setDraft(next.draft || "");
      setBusy(Boolean(client.currentTurnId));
      setError("");
      setStatus(t("会话已恢复 · 输入后按 Enter 继续聊天"));
      setCurrentModel(client.currentModelSelection);
      save(next);
      setPage("chat");
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未能打开会话"),
        message: messageOf(reason),
      });
    } finally {
      requestPendingRef.current = false;
      setSwitching(false);
    }
  }

  function changePage(value: string) {
    if (switching) return;
    if (value === "new") {
      void newChat();
      return;
    }
    if (persistedRef.current)
      save({ ...persistedRef.current, draft: draftRef.current });
    if (value === "chat" || value === "recent") setPage(value);
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

  const codexNotFound = Boolean(error && !ready);
  const secondaryActions = (
    <>
      {codexNotFound && (
        <Action.OpenInBrowser
          title={t("安装 Codex CLI")}
          icon={Icon.Download}
          url="https://github.com/openai/codex#installation"
        />
      )}
      {busy && (
        <Action
          title={t("停止回答")}
          icon={Icon.Stop}
          shortcut={{
            modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
            key: ".",
          }}
          onAction={async () => {
            try {
              await clientRef.current?.interrupt();
              setStatus(t("正在停止…"));
            } catch (reason) {
              await reportFailure(reason, "");
            }
          }}
        />
      )}
      <Action
        title={t("最近对话")}
        icon={Icon.Clock}
        shortcut={{
          modifiers: [process.platform === "darwin" ? "cmd" : "ctrl", "shift"],
          key: "h",
        }}
        onAction={() => changePage("recent")}
      />
      {answer && (
        <Action.CopyToClipboard
          title={t("复制回答")}
          content={answer}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
      <Action.CopyToClipboard
        title={t("复制当前对话")}
        content={transcript(conversation.messages)}
        shortcut={{
          modifiers: [process.platform === "darwin" ? "cmd" : "ctrl", "shift"],
          key: "c",
        }}
      />
      <Action
        title={t("新建对话")}
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={newChat}
      />
      <Action
        title={t("Language and Default Model")}
        icon={Icon.Globe}
        onAction={() => {
          if (busy || switching || requestPendingRef.current) {
            void showToast({
              style: Toast.Style.Failure,
              title: t("请先停止当前回答"),
            });
            return;
          }
          props.onConfigure(modelSelection || currentModel);
        }}
      />
      <Action
        title={t("打开设置")}
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </>
  );
  const visibleMessages = useMemo(
    () =>
      conversation.messages.filter(
        (message) => message.content.trim() || message.status === "streaming",
      ),
    [conversation.messages],
  );
  const chatMarkdown = useMemo(
    () =>
      conversationMarkdown(
        visibleMessages,
        environment.assetsPath,
        !ready && !error ? status : "",
        error,
      ),
    [visibleMessages, ready, error, status],
  );
  const historyProps = useSessionHistory({
    page,
    sessions,
    activeId: conversation.threadId,
    onSelect: resumeSession,
    onBack: () => changePage("chat"),
    onNew: newChat,
  });
  const chatActions = () => (
    <ActionPanel
      title={[
        modelSelection?.model || currentModel.model,
        modelSelection?.effort ?? currentModel.effort,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      {!ready && error ? (
        <Action
          title={t("重新连接")}
          icon={Icon.ArrowClockwise}
          onAction={reconnect}
        />
      ) : (
        <MessageComposer
          draft={draft}
          busy={busy}
          ready={ready}
          onChange={setDraft}
          onSend={sendPrompt}
        />
      )}
      {secondaryActions}
      <ModelMenu
        models={models}
        selection={modelSelection}
        current={currentModel}
        loading={modelsLoading}
        error={modelsError}
        ready={ready}
        onRefresh={() => void refreshModels().catch(() => undefined)}
        onSelect={selectModel}
      />
    </ActionPanel>
  );
  if (page === "chat") {
    return (
      <Detail
        navigationTitle="Codex in Raycast"
        markdown={chatMarkdown}
        isLoading={(!ready && !error) || busy || switching}
        actions={chatActions()}
      />
    );
  }
  return (
    <List
      navigationTitle="Codex in Raycast"
      filtering={false}
      throttle={false}
      isShowingDetail={false}
      isLoading={(!ready && !error) || busy || switching}
      {...historyProps}
    >
      {historyProps.children}
    </List>
  );
}
