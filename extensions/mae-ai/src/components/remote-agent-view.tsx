import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { deviceHost } from "../lib/agents/device-vault";
import { HermesAdapter } from "../lib/agents/hermes";
import { OpenClawAdapter } from "../lib/agents/openclaw";
import {
  AgentAdapter,
  AgentApproval,
  AgentBackend,
  AgentEmit,
  AgentMessage,
  AgentSession,
  AgentState,
  AgentTarget,
  agentScope,
  replaceAnswer,
  safeAgentError,
  terminal,
} from "../lib/agents/types";
import { responseRows } from "../lib/response-rows";
import { useFollowLatest } from "../hooks/use-follow-latest";
import { agentPresentation } from "../lib/agent-presentation";
import { Preferences } from "../lib/preferences";
import { renderPrompt, Tool, toolPlaceholder } from "../lib/tools";
import SettingsView from "./settings-view";
import AgentSettingsView from "./agent-settings";
import BackendMenu, { BackendChange } from "./backend-menu";

function ApprovalReview({
  approval,
  onDecide,
}: {
  approval: AgentApproval;
  onDecide: (approval: AgentApproval, allow: boolean) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const locked = useRef(false);
  async function decide(allow: boolean) {
    if (locked.current) return;
    locked.current = true;
    setSubmitting(true);
    if (await onDecide(approval, allow)) pop();
    else {
      locked.current = false;
      setSubmitting(false);
    }
  }
  return (
    <Detail
      isLoading={submitting}
      markdown={`# ${approval.title}\n\n${approval.detail}\n\nOnly this pending request is affected. Tools execute on the remote server.`}
      actions={
        <ActionPanel>
          {approval.allow && (
            <Action
              title="Approve Once"
              icon={Icon.Checkmark}
              onAction={() => decide(true)}
            />
          )}
          <Action
            title="Deny"
            icon={Icon.XMarkCircle}
            onAction={() => decide(false)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function RemoteAgentView({
  tool,
  initialQuery,
  autoSubmitInitialQuery,
  backend,
  url,
  secret,
  onSettingsChange,
  onBackendChange,
}: {
  tool: Tool;
  initialQuery: string;
  autoSubmitInitialQuery: boolean;
  backend: AgentBackend;
  url: string;
  secret: string;
  onSettingsChange: () => Promise<void>;
  onBackendChange: BackendChange;
}) {
  const { push } = useNavigation();
  const config = useMemo(
    () => ({ backend, url, secret }),
    [backend, url, secret],
  );
  const scope = useMemo(() => agentScope(config), [config]);
  const name = backend === "hermes" ? "Hermes" : "OpenClaw";
  const [revision, setRevision] = useState(0);
  const [targets, setTargets] = useState<AgentTarget[]>([]);
  const [target, setTarget] = useState("");
  const [ready, setReady] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [state, setState] = useState<AgentState>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<string[]>([]);
  const [approvals, setApprovals] = useState<AgentApproval[]>([]);
  const [rich, setRich] = useState(
    getPreferenceValues<Preferences>().responseView !== "plain",
  );
  const adapter = useRef<AgentAdapter | undefined>(undefined);
  const session = useRef<AgentSession | undefined>(undefined);
  const watcher = useRef<AbortController | undefined>(undefined);
  const storageWrites = useRef(Promise.resolve());
  const mounted = useRef(true);
  const submissionLock = useRef(false);
  const autoSubmitted = useRef(false);
  const generation = useRef(0);
  const busy =
    restoring ||
    state === "running" ||
    state === "stopping" ||
    state === "unknown";
  const presentation = useMemo(
    () => agentPresentation(messages, progress, approvals, state, error, rich),
    [messages, progress, approvals, state, error, rich],
  );
  const follow = useFollowLatest(
    presentation.latestId,
    presentation.itemIds,
    state === "running",
  );
  const { following } = follow;
  const sessionKey = useCallback(
    (agent: string) =>
      `pocket-ai.agent-session.v1:${scope}:${encodeURIComponent(agent)}`,
    [scope],
  );

  const report = useCallback(
    (failure: unknown) => {
      if (mounted.current) setError(safeAgentError(failure, secret));
    },
    [secret],
  );
  const persist = useCallback(
    (value: AgentSession) => {
      const key = sessionKey(value.target);
      const encoded = JSON.stringify(value);
      const write = storageWrites.current
        .catch(() => undefined)
        .then(() => LocalStorage.setItem(key, encoded));
      storageWrites.current = write;
      return write;
    },
    [sessionKey],
  );

  const emit = useCallback(
    (epoch: number, signal: AbortSignal): AgentEmit => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let pendingText: string | undefined;
      const valid = () =>
        mounted.current && generation.current === epoch && !signal.aborted;
      function clear() {
        if (timer) clearTimeout(timer);
        timer = undefined;
      }
      function flush() {
        clear();
        const text = pendingText;
        pendingText = undefined;
        if (valid() && text !== undefined)
          setMessages((items) => replaceAnswer(items, text));
      }
      signal.addEventListener("abort", clear, { once: true });
      return (event) => {
        if (!valid()) return;
        if (event.type === "history") {
          clear();
          pendingText = undefined;
          setMessages(event.messages);
        } else if (event.type === "text") {
          pendingText = event.text;
          if (!timer) timer = setTimeout(flush, 40);
        } else if (event.type === "state") {
          flush();
          if (terminal(event.state)) submissionLock.current = false;
          setState(event.state);
          if (event.error) setError(event.error);
        } else if (event.type === "progress") {
          if (event.text)
            setProgress((items) =>
              [
                ...items.filter((text) => text !== event.text),
                event.text,
              ].slice(-6),
            );
        } else if (event.type === "approvals") setApprovals(event.approvals);
        else if (event.type === "session") {
          session.current = event.session;
          void persist(event.session).catch(report);
        }
      };
    },
    [persist, report],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      watcher.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let activeAdapter: AgentAdapter | undefined;
    setReady(false);
    setRestoring(true);
    setError("");
    setTargets([]);
    setTarget("");
    async function connect() {
      if (backend === "hermes") activeAdapter = new HermesAdapter(config);
      else {
        const host = await deviceHost(
          {
            read: (key) => LocalStorage.getItem<string>(key),
            write: (key, value) => LocalStorage.setItem(key, value),
          },
          scope,
          secret,
        );
        if (controller.signal.aborted) return;
        activeAdapter = new OpenClawAdapter(config, host.deps, host.flush);
      }
      adapter.current = activeAdapter;
      const available = await activeAdapter.targets(controller.signal);
      const remembered = await LocalStorage.getItem<string>(
        `pocket-ai.agent-target.v1:${scope}`,
      );
      if (controller.signal.aborted) return;
      setTargets(available);
      setTarget(
        available.some((item) => item.id === remembered)
          ? remembered!
          : available[0].id,
      );
      setReady(true);
    }
    void connect().catch((failure) => {
      if (!controller.signal.aborted) {
        report(failure);
        setRestoring(false);
      }
    });
    return () => {
      controller.abort();
      generation.current++;
      watcher.current?.abort();
      adapter.current = undefined;
      void activeAdapter?.close().catch(report);
    };
  }, [config, backend, scope, secret, revision, report]);

  useEffect(() => {
    if (!ready || !target || !adapter.current) return;
    const client = adapter.current;
    watcher.current?.abort();
    const controller = new AbortController();
    watcher.current = controller;
    const epoch = ++generation.current;
    const receive = emit(epoch, controller.signal);
    session.current = undefined;
    setRestoring(true);
    setMessages([]);
    setProgress([]);
    setApprovals([]);
    setError("");
    setState("idle");
    async function restore() {
      await LocalStorage.setItem(`pocket-ai.agent-target.v1:${scope}`, target);
      const saved = await LocalStorage.getItem<string>(sessionKey(target));
      if (controller.signal.aborted) return;
      if (saved && saved !== "null") {
        const previous = JSON.parse(saved) as AgentSession;
        if (!previous.id || previous.target !== target)
          throw new Error("Invalid saved agent session.");
        setState(
          previous.runId || previous.pendingSubmission ? "running" : "idle",
        );
        const restored = await client.restore(previous, receive);
        if (controller.signal.aborted) return;
        session.current = restored;
        await persist(restored);
        setRestoring(false);
        if (restored.runId)
          await client.watch(restored, receive, controller.signal);
      } else setRestoring(false);
    }
    void restore().catch((failure) => {
      if (!controller.signal.aborted) {
        report(failure);
        setState("unknown");
        setRestoring(false);
      }
    });
    return () => controller.abort();
  }, [ready, target, scope, sessionKey, emit, persist, report]);

  async function send() {
    const text = query.trim();
    const client = adapter.current;
    if (!text || !client || !ready || !target || submissionLock.current) return;
    if (busy) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Wait for the Remote Run",
        message:
          "Stop or reconcile the current run before sending a follow-up.",
      });
      return;
    }
    submissionLock.current = true;
    watcher.current?.abort();
    const controller = new AbortController();
    watcher.current = controller;
    const epoch = ++generation.current;
    const receive = emit(epoch, controller.signal);
    setState("running");
    setError("");
    setProgress([]);
    setApprovals([]);
    follow.resume();
    try {
      const instructions = renderPrompt(tool.prompt, tool.targetLanguage || "");
      const current = session.current || (await client.create(target));
      const submissionId = randomUUID();
      const pending = {
        ...current,
        runId: undefined,
        pendingSubmission: submissionId,
      };
      session.current = pending;
      // Persist routing/receipt identity before dispatch, never the prompt or transcript.
      await persist(pending);
      if (controller.signal.aborted) return;
      setMessages((items) => [...items, { role: "user", text }]);
      setQuery("");
      const accepted = await client.send(
        pending,
        text,
        instructions,
        submissionId,
      );
      session.current = accepted;
      await persist(accepted);
      if (controller.signal.aborted) return;
      await client.watch(accepted, receive, controller.signal);
    } catch (failure) {
      if (!controller.signal.aborted) {
        report(failure);
        setState(
          session.current?.pendingSubmission || session.current?.runId
            ? "unknown"
            : "failed",
        );
      }
    } finally {
      if (generation.current === epoch) submissionLock.current = false;
    }
  }

  useEffect(() => {
    if (
      autoSubmitInitialQuery &&
      initialQuery &&
      ready &&
      !busy &&
      !submissionLock.current &&
      !autoSubmitted.current
    ) {
      autoSubmitted.current = true;
      void send();
    }
  });

  async function stop() {
    if (!adapter.current || !session.current?.runId) return;
    try {
      setState("stopping");
      await adapter.current.stop(session.current);
      setProgress((items) =>
        [
          ...items,
          "Stop requested; waiting for the remote executor to settle.",
        ].slice(-6),
      );
    } catch (failure) {
      report(failure);
      setState("unknown");
    }
  }

  async function decide(approval: AgentApproval, allow: boolean) {
    if (!adapter.current || !session.current) return false;
    try {
      await adapter.current.approve(session.current, approval, allow);
      setApprovals((items) => items.filter((item) => item.id !== approval.id));
      await showToast({
        style: Toast.Style.Success,
        title: allow ? "Approved Once" : "Denied",
      });
      return true;
    } catch (failure) {
      report(failure);
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Resolve Approval",
        message: safeAgentError(failure, secret),
      });
      return false;
    }
  }

  async function newConversation() {
    if (state === "running" || state === "stopping" || restoring) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Stop the Current Run First",
      });
      return;
    }
    if (
      state === "unknown" &&
      !(await confirmAlert({
        title: "Unconfirmed Remote Work",
        message:
          "The previous task may still be running. Review it on the server first. Start a separate conversation without replaying it?",
        primaryAction: { title: "Start Separate Conversation" },
      }))
    )
      return;
    watcher.current?.abort();
    generation.current++;
    await storageWrites.current.catch(() => undefined);
    await LocalStorage.removeItem(sessionKey(target));
    session.current = undefined;
    setMessages([]);
    setApprovals([]);
    setProgress([]);
    setError("");
    setState("idle");
    setQuery("");
    follow.reset();
  }

  function actions() {
    return (
      <ActionPanel>
        <Action
          title={
            query.trim()
              ? "Send to Agent"
              : state === "running"
                ? "Stop Remote Run"
                : "Send to Agent"
          }
          icon={Icon.Message}
          onAction={query.trim() ? send : state === "running" ? stop : send}
        />
        <BackendMenu
          backend={backend}
          query={query}
          onChange={onBackendChange}
        />
        {session.current?.runId && (
          <Action
            title="Stop Remote Run"
            icon={Icon.Stop}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={stop}
          />
        )}
        <Action
          title="Reconnect and Resume"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => setRevision((value) => value + 1)}
        />
        <Action
          title={following ? "Pause Auto-Scroll" : "Jump to Latest and Resume"}
          icon={Icon.ArrowDown}
          shortcut={{
            Windows: { modifiers: ["ctrl"], key: "l" },
            macOS: { modifiers: ["cmd"], key: "l" },
          }}
          onAction={follow.toggle}
        />
        <Action
          title={rich ? "Use Full-Width Text" : "Show Rich Markdown"}
          icon={Icon.Document}
          onAction={() => {
            setRich((value) => !value);
            follow.resume();
          }}
        />
        <Action.CopyToClipboard
          title="Copy Latest Reply"
          content={
            [...messages].reverse().find((item) => item.role === "assistant")
              ?.text || ""
          }
        />
        <Action.Push
          title="Open Formatted Conversation"
          icon={Icon.Document}
          target={
            <Detail
              markdown={messages
                .map(
                  (item) =>
                    `## ${item.role === "user" ? "You" : name}\n\n${item.text}`,
                )
                .join("\n\n---\n\n")}
            />
          }
        />
        <Action
          title="New Conversation"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={newConversation}
        />
        <Action.Push
          title="Configure Remote Agents"
          icon={Icon.Gear}
          target={<AgentSettingsView onSave={onSettingsChange} />}
        />
        <Action
          title="Pocket AI Settings"
          icon={Icon.Gear}
          onAction={() => push(<SettingsView onChange={onSettingsChange} />)}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle={`${tool.title} · ${name}`}
      isLoading={restoring || state === "running" || state === "stopping"}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={toolPlaceholder(tool, messages.length > 0)}
      selectedItemId={follow.selectedItemId}
      onSelectionChange={follow.onSelectionChange}
      isShowingDetail={rich && presentation.itemIds.length > 0}
      actions={actions()}
      searchBarAccessory={
        targets.length ? (
          <List.Dropdown
            tooltip="Remote Agent (uses its server-configured model)"
            value={target}
            defaultValue={target}
            storeValue={false}
            onChange={(value) => {
              if (!busy && !submissionLock.current) setTarget(value);
            }}
          >
            {[...targets]
              .sort((a, b) => Number(b.id === target) - Number(a.id === target))
              .map((item) => (
                <List.Dropdown.Item
                  key={item.id}
                  value={item.id}
                  title={item.title}
                />
              ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {!presentation.itemIds.length && (
        <List.EmptyView
          icon="pocket-ai-native.png"
          title={tool.title}
          description="Type in the top bar and press Enter. Follow-ups keep the same conversation."
        />
      )}
      {presentation.rows.map((row) => (
        <List.Item
          key={row.id}
          id={row.id}
          title={
            rich
              ? row.role === "user"
                ? responseRows(row.text)[0] || "Question"
                : "Response"
              : row.text
          }
          detail={
            rich ? (
              <List.Item.Detail
                markdown={row.text}
                isLoading={
                  state === "running" &&
                  row.id === presentation.rows.at(-1)?.id &&
                  row.role === "assistant"
                }
              />
            ) : undefined
          }
          icon={row.role === "user" ? Icon.Person : undefined}
          actions={actions()}
        />
      ))}
      {progress.length > 0 && (
        <List.Section title="Agent Activity">
          {progress.map((text, index) => (
            <List.Item
              key={index}
              id={`progress-${index}`}
              title={text}
              detail={rich ? <List.Item.Detail markdown={text} /> : undefined}
              icon={Icon.Terminal}
              actions={actions()}
            />
          ))}
        </List.Section>
      )}
      {presentation.approvals.map((approval) => (
        <List.Item
          key={approval.id}
          id={`approval-${approval.id}`}
          title={approval.title}
          subtitle="Review required"
          detail={
            rich ? (
              <List.Item.Detail
                markdown={`# ${approval.title}\n\n${approval.detail}`}
              />
            ) : undefined
          }
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Push
                title="Review Approval"
                target={
                  <ApprovalReview approval={approval} onDecide={decide} />
                }
              />
              <BackendMenu
                backend={backend}
                query={query}
                onChange={onBackendChange}
              />
            </ActionPanel>
          }
        />
      ))}
      {presentation.status && (
        <List.Item
          id="agent-state"
          title={presentation.status}
          detail={
            rich ? (
              <List.Item.Detail markdown={presentation.status} />
            ) : undefined
          }
          subtitle="Tools run on the agent's machine"
          icon={Icon.Network}
          actions={actions()}
        />
      )}
      {error && (
        <List.Item
          id="agent-error"
          title={error}
          detail={rich ? <List.Item.Detail markdown={error} /> : undefined}
          icon={Icon.ExclamationMark}
          actions={actions()}
        />
      )}
    </List>
  );
}
