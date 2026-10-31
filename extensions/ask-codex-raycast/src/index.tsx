import { setLanguage, t } from "./i18n";
import {
  createProviderClient,
  providerCapabilities,
  providerIcon,
  PROVIDER_LABELS,
  isProviderId,
  type ProviderId,
  type ChatClient,
} from "./provider";
import { ProviderMenu } from "./provider-menu";
import {
  PROVIDERS,
  storageKeys,
  resolveModelPolicy,
  modelPolicyPreference,
  type ModelPolicy,
} from "./session-storage";
import { PROVIDER_COMMANDS, providerForCommand } from "./command-routing";
import { SetupWizard } from "./setup";
import { ModelSettings } from "./model-settings";
import {
  connectionSignature,
  parseSetup,
  validSelection,
  type Setup,
} from "./setup-state";
import {
  Action,
  ActionPanel,
  Detail,
  environment,
  launchCommand,
  LaunchType,
  List,
  getPreferenceValues,
  Icon,
  Keyboard,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  type LaunchProps,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { type CodexEvent, type CodexModel, type ModelSelection } from "./codex";
import { useSessionHistory, type Page } from "./history";
import { conversationMarkdown } from "./chat-text";
import { MessageComposer, type ComposerInput } from "./message-composer";
import { ModelMenu, EffortMenu } from "./model-menu";
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
  type ChatMessage,
  type StoredConversation,
  type ConversationLibrary,
} from "./conversations";

export default function AIInRaycast(
  props: LaunchProps<{ arguments: Arguments.Index }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  setLanguage(preferences.uiLanguage);
  const provider = providerForCommand(environment.commandName);
  const signature = connectionSignature(preferences, provider);
  const modelStrategy = preferences[modelPolicyPreference(provider)];
  useEffect(() => {
    void updateCommandMetadata({
      subtitle: t("Chat with your local {provider} CLI", {
        provider: PROVIDER_LABELS[provider],
      }),
    }).catch(() => {});
  }, [provider]);
  const launchConsumed = useRef(false);
  async function changeProvider(value: string) {
    if (!isProviderId(value) || value === provider) return;
    try {
      await launchCommand({
        name: PROVIDER_COMMANDS[value],
        type: LaunchType.UserInitiated,
      });
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Could Not Switch CLI"),
        message: `${messageOf(reason)} ${t("Enable this command in Raycast Settings → Extensions → AI CLI in Raycast.")}`,
      });
    }
  }
  return (
    <ConfiguredCommand
      key={`${provider}:${signature}:${modelStrategy || "saved"}`}
      provider={provider}
      onProviderChange={changeProvider}
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
  provider,
  onProviderChange,
}: {
  launch: LaunchProps<{ arguments: Arguments.Index }>;
  preferences: Preferences;
  launchConsumed: { current: boolean };
  provider: ProviderId;
  onProviderChange: (value: string) => Promise<void>;
}) {
  const keys = storageKeys(provider);
  const [loaded, setLoaded] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [savedSelection, setSavedSelection] = useState<ModelSelection | null>(
    null,
  );
  const [modelPolicy, setModelPolicy] = useState<ModelPolicy>({
    mode: "last",
    selection: null,
  });
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError("");
      const saved = parseSetup(await LocalStorage.getItem<string>(keys.setup));
      const rawSelection = await LocalStorage.getItem<string>(keys.model);
      const policy = resolveModelPolicy(
        await LocalStorage.getItem<string>(keys.modelPolicy),
        provider,
        preferences,
      );
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
      setSetup(saved);
      setModelPolicy(policy);
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
    setup.connection !== connectionSignature(preferences, provider)
  )
    return (
      <SetupWizard
        preferences={preferences}
        provider={provider}
        onProviderChange={onProviderChange}
        previous={setup}
        selection={savedSelection}
        onComplete={(value) => {
          void (async () => {
            // An explicit setup choice also sets the fixed default, without
            // asking for the same model again in a second settings form.
            if (modelPolicy.mode === "fixed") {
              const fixed: ModelPolicy = {
                mode: "fixed",
                selection: value.selection,
              };
              await LocalStorage.setItem(
                keys.modelPolicy,
                JSON.stringify(fixed),
              );
              setModelPolicy(fixed);
            }
            setSetup(value);
            setSavedSelection(value.selection);
            setEditing(false);
          })().catch((reason) =>
            showToast({
              style: Toast.Style.Failure,
              title: t("Could not save settings"),
              message: messageOf(reason),
            }),
          );
        }}
      />
    );
  if (modelPolicy.mode === "fixed" && !modelPolicy.selection)
    return (
      <ModelSettings
        provider={provider}
        onSaved={() => {
          setLoaded(false);
          setAttempt((value) => value + 1);
        }}
      />
    );
  return (
    <NativeChat
      provider={provider}
      onProviderChange={onProviderChange}
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
    provider: ProviderId;
    onProviderChange: (value: string) => Promise<void>;
  },
) {
  const preferences = getPreferenceValues<Preferences>();
  const keys = storageKeys(props.provider);
  const capabilities = providerCapabilities(props.provider);
  const initialPrompt =
    props.fallbackText?.trim() || props.arguments?.prompt?.trim() || "";
  const [conversation, setConversation] =
    useState<StoredConversation>(emptyConversation);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    t("Connecting to {provider}…", { provider: capabilities.label }),
  );
  const [statusVisible, setStatusVisible] = useState(true);
  function updateStatus(text: string, visible = true) {
    setStatus(text);
    setStatusVisible(visible);
  }
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
  const composerInputRef = useRef<ComposerInput | null>(null);
  const modelPolicyRef = useRef<ModelPolicy>({ mode: "last", selection: null });
  const modelsRef = useRef<CodexModel[]>([]);
  const modelsRequestRef = useRef<Promise<CodexModel[]> | null>(null);
  const modelSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const libraryRef = useRef<ConversationLibrary>({
    version: 2,
    activeId: null,
    sessions: [],
  });
  const storageReadyRef = useRef(false);
  const clientRef = useRef<ChatClient | null>(null);
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
  const draftEditRevision = useRef(0);
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

  function setDraftValue(text: string) {
    draftRef.current = text;
    if (persistedRef.current)
      persistedRef.current = { ...persistedRef.current, draft: text };
    else if (!text)
      void LocalStorage.removeItem(keys.pendingDraft).catch(() => {});
    setDraft(text);
  }

  function editDraft(text: string) {
    if (switching) return;
    draftEditRevision.current += 1;
    setDraftValue(text);
  }

  function clearDraft() {
    draftEditRevision.current += 1;
    setDraftValue("");
  }

  function persistLibrary() {
    if (!storageReadyRef.current) return;
    const encoded = JSON.stringify(libraryRef.current);
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => LocalStorage.setItem(keys.library, encoded));
    void saveQueueRef.current.catch((reason) => {
      if (mountedRef.current)
        setError(
          t("Could not save conversation: {error}", {
            error: messageOf(reason),
          }),
        );
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
    // A refresh is a new availability check, not permission to keep choosing
    // an older catalog while the CLI is loading or has failed.
    modelsRef.current = [];
    setModels([]);
    const request = Promise.resolve().then(() => client.listModels());
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

  function rememberModelSelection(selection: ModelSelection) {
    modelSelectionRef.current = { ...selection };
    setModelSelection({ ...selection });
    const encoded = JSON.stringify(selection);
    modelSaveQueueRef.current = modelSaveQueueRef.current
      .catch(() => undefined)
      .then(() => LocalStorage.setItem(keys.model, encoded));
    void modelSaveQueueRef.current.catch((reason) =>
      showToast({
        style: Toast.Style.Failure,
        title: t("Could not save model selection"),
        message: messageOf(reason),
      }),
    );
  }

  function selectModel(selection: ModelSelection | null) {
    if (
      !mountedRef.current ||
      !readyRef.current ||
      requestPendingRef.current ||
      switching
    )
      return false;
    // "Use current" remembers the actual model, rather than persisting null
    // and silently returning to the CLI default when a new chat is opened.
    selection = selection || clientRef.current?.currentModelSelection || null;
    if (
      modelsRequestRef.current ||
      !selection ||
      !validSelection(modelsRef.current, selection)
    ) {
      void showToast({
        style: Toast.Style.Failure,
        title: t(
          "The selected model or effort level is no longer available. Please reselect a model in Actions at the bottom.",
        ),
      });
      return false;
    }
    rememberModelSelection(selection);
    void showToast({
      style: Toast.Style.Success,
      title: selection
        ? [
            selection.model === "__cli_default__"
              ? t("CLI Default")
              : selection.model,
            selection.effort,
          ]
            .filter(Boolean)
            .join(" · ")
        : t("Use Current Conversation Model"),
      message:
        busy && capabilities.supportsSteering
          ? t(
              "Used for the next reply; steering the current response will still use the original model.",
            )
          : t("This setting applies to the next message."),
    });
    return true;
  }

  useEffect(() => {
    let disposed = false;
    mountedRef.current = true;
    readyRef.current = false;
    activeReplyRef.current = null;
    setReady(false);
    setError("");
    updateStatus(
      t("Connecting to {provider}…", { provider: capabilities.label }),
    );
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
        updateStatus(t("Thinking…"));
      }
      if (event.method === "item/started") {
        const type = asString(asRecord(params.item).type);
        if (type === "webSearch") updateStatus(t("Searching the web…"));
        else if (type === "commandExecution")
          updateStatus(t("Running command…"));
        else if (type === "mcpToolCall") updateStatus(t("Calling tool…"));
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
        updateStatus(t("Responding…"));
      }
      if (event.method === "turn/completed") {
        const turn = asRecord(params.turn);
        setBusy(false);
        const failure = asString(asRecord(turn.error).message);
        if (failure) setError(failure);
        updateStatus(
          turn.status === "failed"
            ? t("Response failed. You can retry")
            : turn.status === "interrupted"
              ? t("Stopped · Press Enter to continue chatting")
              : t("Completed · Press Enter to continue chatting"),
          turn.status !== "completed",
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
            t("{provider} returned an error", { provider: capabilities.label }),
        );
      }
      if (
        event.method.includes("requestApproval") ||
        event.method.includes("requestUserInput") ||
        event.method === "request/unsupported"
      ) {
        setError(
          t(
            "This action requires interactive confirmation, which is not automatically authorized in this interface. Please stop this turn and continue this session in the Codex CLI.",
          ),
        );
      }
      if (event.method === "process/exited") {
        readyRef.current = false;
        setReady(false);
        setBusy(false);
        setError(
          asString(params.stderr) ||
            t("{provider} connection closed. Please reconnect.", {
              provider: capabilities.label,
            }),
        );
        updateStatus(t("Connection closed"));
      }
    };
    const client = createProviderClient(props.provider, {
      onEvent: handleEvent,
      sandbox: preferences.sandboxMode || "read-only",
      cwd: preferences.workingDirectory,
      codexPath: preferences.codexPath,
      agyPath: preferences.agyPath,
      qoderPath: preferences.qoderPath,
      qoderCnPath: preferences.qoderCnPath,
      workbuddyPath: preferences.workbuddyPath,
      geminiPath: preferences.geminiPath,
      liveSearch: preferences.liveSearch ?? true,
      autoDetectCli: preferences.autoDetectCli,
    });
    clientRef.current = client;
    const initialize = async () => {
      await saveQueueRef.current.catch(() => undefined);
      await modelSaveQueueRef.current.catch(() => undefined);
      const savedModel = await LocalStorage.getItem<string>(keys.model);
      const policy = resolveModelPolicy(
        await LocalStorage.getItem<string>(keys.modelPolicy),
        props.provider,
        preferences,
      );
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
      modelPolicyRef.current = policy;
      if (policy.mode === "fixed") selection = policy.selection;
      modelSelectionRef.current = selection;
      setModelSelection(selection);
      const library = parseLibrary(
        await LocalStorage.getItem<string>(keys.library),
        await LocalStorage.getItem<string>(keys.legacy),
      );
      if (disposed) return;
      libraryRef.current = library;
      storageReadyRef.current = true;
      setSessions(library.sessions);
      const stored =
        library.sessions.find(
          (session) => session.threadId === library.activeId,
        ) || emptyConversation();
      const pendingDraft = await LocalStorage.getItem<string>(
        keys.pendingDraft,
      );
      if (disposed) return;
      setConversation(stored);
      // Synchronize the ref before connecting: a fast connection may finish
      // before React renders the restored draft. Keep text typed while loading.
      // A draft typed before the connection finished has no session yet; it
      // lives in its own key until this connection decides where it belongs.
      if (draftEditRevision.current === 0)
        setDraftValue(stored.draft || pendingDraft || "");
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
              t(
                "Previous conversation could not be restored and has been kept in history: {error}",
                { error: messageOf(reason) },
              ),
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
      setDraftValue(resumed.draft || "");
      save(resumed);
      void LocalStorage.removeItem(keys.pendingDraft).catch(() => {});
      setBusy(Boolean(client.currentTurnId));
      setCurrentModel(client.currentModelSelection);
      readyRef.current = true;
      setReady(true);
      updateStatus(
        client.currentTurnId
          ? t("Thinking…")
          : t("Connected · Press Enter to send"),
        Boolean(client.currentTurnId),
      );
      void refreshModels().catch(() => undefined);
    };
    initRef.current = initialize();
    void initRef.current.catch((reason: unknown) => {
      if (!disposed) {
        setError(messageOf(reason));
        updateStatus(t("Connection failed"));
      }
    });
    return () => {
      disposed = true;
      mountedRef.current = false;
      readyRef.current = false;
      if (persistedRef.current) save(persistedRef.current);
      else if (draftRef.current)
        void LocalStorage.setItem(keys.pendingDraft, draftRef.current).catch(
          () => {},
        );
      client.close();
    };
  }, [
    props.provider,
    preferences.agyPath,
    preferences.qoderPath,
    preferences.qoderCnPath,
    preferences.workbuddyPath,
    preferences.geminiPath,
    preferences.codexPath,
    preferences.workingDirectory,
    preferences.sandboxMode,
    preferences.liveSearch,
    preferences.autoDetectCli,
    connectionAttempt,
  ]);

  useEffect(() => {
    if (!conversation.threadId) {
      if (draft)
        void LocalStorage.setItem(keys.pendingDraft, draft).catch(() => {});
      return;
    }
    void LocalStorage.removeItem(keys.pendingDraft).catch(() => {});
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
      throw new Error(t("Service not connected. Please reopen the command."));
    setError("");
    if (client.currentTurnId) {
      if (!capabilities.supportsSteering)
        throw new Error(
          t(
            "Wait for the current reply or stop it before sending another message.",
          ),
        );
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
        updateStatus(t("Steer sent"));
        return;
      } catch (reason) {
        // The turn may complete between pressing Enter and the steer RPC.
        // Only retry as a follow-up when there is no active turn anymore.
        if (client.currentTurnId) throw reason;
      }
    }
    if (
      modelPolicyRef.current.mode === "fixed" &&
      !modelPolicyRef.current.selection
    )
      throw new Error(
        t("Choose a fixed model and effort in CLI Settings first."),
      );
    if (selection) {
      const catalog = await refreshModels();
      if (
        !mountedRef.current ||
        clientRef.current !== client ||
        !readyRef.current
      )
        throw new Error(t("Service not connected. Please reopen the command."));
      if (!validSelection(catalog, selection)) {
        throw new Error(
          t(
            "The selected model or effort level is no longer available. Please reselect a model in Actions at the bottom.",
          ),
        );
      }
    }
    const userId = makeId();
    const replyId = makeId();
    activeReplyRef.current = replyId;
    setBusy(true);
    updateStatus(t("Thinking…"));
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
      if (mountedRef.current && clientRef.current === client) {
        setCurrentModel(client.currentModelSelection);
        if (!selection && client.currentModelSelection.model)
          rememberModelSelection(client.currentModelSelection);
      }
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

  async function reportFailure(
    reason: unknown,
    prompt: string,
    restoreDraft = true,
  ) {
    if (!mountedRef.current) return;
    const message = messageOf(reason);
    setError(message);
    if (restoreDraft && !draftRef.current) setDraftValue(prompt);
    await showToast({
      style: Toast.Style.Failure,
      title: t("Failed to send"),
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
    const text = prompt;
    if (!text.trim() || switching) return false;
    if (busy && !capabilities.supportsSteering) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Wait for the Reply or Stop It First"),
      });
      return false;
    }
    if (requestPendingRef.current) return false;
    if (!readyRef.current) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Service not connected"),
        message: t(
          'Text has been preserved. Please wait for connection or click "Reconnect".',
        ),
      });
      return false;
    }
    requestPendingRef.current = true;
    const submittedRevision = draftEditRevision.current;
    try {
      await enqueue(text);
      // Keep pending input durable until the CLI acknowledges it. New edits,
      // including the same text retyped or an explicit clear, take precedence.
      if (mountedRef.current && draftEditRevision.current === submittedRevision)
        setDraftValue("");
      return true;
    } catch (reason) {
      await reportFailure(
        reason,
        text,
        draftEditRevision.current === submittedRevision,
      );
      return false;
    } finally {
      requestPendingRef.current = false;
    }
  }

  async function newChat() {
    if (busy || requestPendingRef.current || switching) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Please stop the current response first"),
      });
      return;
    }
    requestPendingRef.current = true;
    setSwitching(true);
    try {
      await initRef.current;
      const client = clientRef.current;
      if (!client || !readyRef.current)
        throw new Error(t("Service not connected"));
      if (persistedRef.current) save(persistedRef.current);
      if (
        modelPolicyRef.current.mode === "last" &&
        !modelSelectionRef.current &&
        client.currentModelSelection.model
      )
        rememberModelSelection(client.currentModelSelection);
      const threadId = await client.startThread();
      if (!mountedRef.current || clientRef.current !== client) return;
      if (modelPolicyRef.current.mode === "fixed") {
        const fixed = modelPolicyRef.current.selection;
        modelSelectionRef.current = fixed;
        setModelSelection(fixed);
      }
      setCurrentModel(client.currentModelSelection);
      const next = {
        threadId,
        messages: [],
        cwd: asString(client.threadSnapshot.cwd),
        updatedAt: Date.now(),
      };
      persistedRef.current = next;
      setConversation(next);
      setDraftValue("");
      save(next);
      setPage("chat");
      activeReplyRef.current = null;
      setError("");
      updateStatus(t("New Chat · Press Enter to send"), false);
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
        title: t("Please stop the current response first"),
        message: t("You can switch conversations after stopping."),
      });
      return;
    }
    requestPendingRef.current = true;
    setSwitching(true);
    try {
      await initRef.current;
      const client = clientRef.current;
      if (!client || !readyRef.current || !session.threadId)
        throw new Error(
          t("Service not connected. Please return to chat and reconnect."),
        );
      if (persistedRef.current) save(persistedRef.current);
      let threadId: string;
      if (session.messages.length) {
        threadId = await client.resumeThread(session.threadId);
      } else {
        // A never-sent conversation has no CLI session mapping yet; reopening
        // it only needs a fresh thread and the saved draft.
        threadId = await client.startThread();
      }
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
      if (threadId !== session.threadId)
        libraryRef.current = {
          ...libraryRef.current,
          sessions: libraryRef.current.sessions.filter(
            (item) => item.threadId !== session.threadId,
          ),
        };
      activeReplyRef.current = null;
      persistedRef.current = next;
      setConversation(next);
      setDraftValue(next.draft || "");
      setBusy(Boolean(client.currentTurnId));
      setError("");
      updateStatus(
        client.currentTurnId
          ? t("Thinking…")
          : t("Session restored · Press Enter to continue chatting"),
        Boolean(client.currentTurnId),
      );
      setCurrentModel(client.currentModelSelection);
      save(next);
      setPage("chat");
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Could not open conversation"),
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
  async function stopResponse() {
    try {
      updateStatus(t("Stopping…"));
      await clientRef.current?.interrupt();
    } catch (reason) {
      await reportFailure(reason, "");
    }
  }
  const stopResponseAction = busy && (
    <Action
      title={t("Stop Response")}
      icon={Icon.Stop}
      shortcut={{
        modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
        key: ".",
      }}
      onAction={stopResponse}
    />
  );
  const secondaryActions = (
    <>
      {codexNotFound && props.provider === "codex" && (
        <Action.OpenInBrowser
          title={t("Install Codex CLI")}
          icon={Icon.Download}
          url="https://github.com/openai/codex#installation"
        />
      )}
      <Action
        title={t("Recent Chats")}
        icon={Icon.Clock}
        shortcut={{
          modifiers: [process.platform === "darwin" ? "cmd" : "ctrl", "shift"],
          key: "h",
        }}
        onAction={() => changePage("recent")}
      />
      {answer && (
        <Action.CopyToClipboard
          title={t("Copy Response")}
          content={answer}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
      <Action.CopyToClipboard
        title={t("Copy Current Conversation")}
        content={transcript(conversation.messages, capabilities.label)}
        shortcut={{
          modifiers: [process.platform === "darwin" ? "cmd" : "ctrl", "shift"],
          key: "c",
        }}
      />
      <Action
        title={t("CLI and Default Model")}
        icon={Icon.Gear}
        onAction={() => {
          if (busy || switching || requestPendingRef.current) {
            void showToast({
              style: Toast.Style.Failure,
              title: t("Please stop the current response first"),
            });
            return;
          }
          props.onConfigure(modelSelection || currentModel);
        }}
      />
      <Action
        title={t("Open Settings")}
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
      <Action
        title={t("CLI Settings")}
        icon={Icon.Terminal}
        onAction={async () => {
          if (busy || switching || requestPendingRef.current) {
            await showToast({
              style: Toast.Style.Failure,
              title: t("Stop the Current Reply First"),
            });
            return;
          }
          requestPendingRef.current = true;
          setSwitching(true);
          try {
            if (persistedRef.current)
              save({ ...persistedRef.current, draft: draftRef.current });
            await saveQueueRef.current;
            await modelSaveQueueRef.current;
            if (!mountedRef.current) return;
            await launchCommand({
              name: "cli-hub",
              type: LaunchType.UserInitiated,
              context: { view: "cli-settings" },
            });
          } catch (reason) {
            if (mountedRef.current)
              await showToast({
                style: Toast.Style.Failure,
                title: t("Could Not Open CLI Settings"),
                message: messageOf(reason),
              });
          } finally {
            requestPendingRef.current = false;
            if (mountedRef.current) setSwitching(false);
          }
        }}
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
        statusVisible ? status : "",
        error,
        capabilities.label,
        providerIcon(props.provider),
      ),
    [visibleMessages, ready, error, status, statusVisible, capabilities.label],
  );
  const historyProps = useSessionHistory({
    page,
    sessions,
    activeId: conversation.threadId,
    onSelect: resumeSession,
    onBack: () => changePage("chat"),
    onNew: newChat,
  });
  const modelMenuProps = {
    inputRef: composerInputRef,
    allowCurrent: props.provider === "codex",
    models,
    selection: modelSelection,
    current: currentModel,
    loading: modelsLoading,
    error: modelsError,
    ready: ready && !switching,
    onRefresh: () => void refreshModels().catch(() => undefined),
    onSelect: selectModel,
  };
  const conversationControls = (shortcuts = true) => (
    <ActionPanel.Section>
      <ProviderMenu
        providers={PROVIDERS}
        shortcuts={shortcuts}
        selected={props.provider}
        onSelect={async (value) => {
          if (value === props.provider) return;
          if (busy || switching || requestPendingRef.current) {
            await showToast({
              style: Toast.Style.Failure,
              title: t("Stop the Current Reply First"),
            });
            return;
          }
          requestPendingRef.current = true;
          setSwitching(true);
          try {
            if (persistedRef.current)
              save({ ...persistedRef.current, draft: draftRef.current });
            await saveQueueRef.current;
            await modelSaveQueueRef.current;
            await props.onProviderChange(value);
          } catch (reason) {
            await showToast({
              style: Toast.Style.Failure,
              title: t("Could Not Save Conversation"),
              message: messageOf(reason),
            });
          } finally {
            requestPendingRef.current = false;
            if (mountedRef.current) setSwitching(false);
          }
        }}
      />
      <ModelMenu {...modelMenuProps} shortcuts={shortcuts} />
      <EffortMenu {...modelMenuProps} shortcuts={shortcuts} />
      <Action
        title={t("New Chat")}
        icon={Icon.Plus}
        shortcut={shortcuts ? Keyboard.Shortcut.Common.New : undefined}
        onAction={newChat}
      />
    </ActionPanel.Section>
  );
  if (page === "chat") {
    return (
      <Detail
        navigationTitle={`${capabilities.label} in Raycast`}
        markdown={chatMarkdown}
        isLoading={(!ready && !error) || busy || switching}
        actions={
          <ActionPanel
            title={[
              modelSelection?.model || currentModel.model,
              modelSelection?.effort ?? currentModel.effort,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <MessageComposer
              inputRef={composerInputRef}
              sendIcon={providerIcon(props.provider)}
              draft={draft}
              busy={busy}
              canSteer={capabilities.supportsSteering}
              ready={ready}
              onChange={editDraft}
              onSend={sendPrompt}
              onStop={stopResponse}
              onRefreshModels={modelMenuProps.onRefresh}
              controls={
                <ActionPanel.Section>
                  <ModelMenu {...modelMenuProps} shortcuts={false} />
                  <EffortMenu {...modelMenuProps} shortcuts={false} />
                </ActionPanel.Section>
              }
            />
            {!ready && error && (
              <Action
                title={t("Reconnect")}
                icon={Icon.ArrowClockwise}
                onAction={reconnect}
              />
            )}
            {stopResponseAction}
            {draft && (
              <Action
                title={t("Clear Draft")}
                icon={Icon.Eraser}
                onAction={clearDraft}
              />
            )}
            {conversationControls()}
            <ActionPanel.Section>{secondaryActions}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List
      navigationTitle={`${capabilities.label} in Raycast`}
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
