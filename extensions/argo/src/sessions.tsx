import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  getPreferenceValues,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Interaction, Message, Session } from "./protocol.js";
import { Hub, HubError, safeMarkdown } from "./core.js";
import { errorText, recentKey, useBridges, useDraft, useHub } from "./hooks.js";
import { loadConnection } from "./connections.js";
import { DiscoverBridges, Setup } from "./onboarding.js";
import { portRange } from "./discovery.js";

export type Context = { bindingId?: string; profileId?: string; connectionKey?: string; recent?: boolean };
export const LAST_CONVERSATION_KEY = "last-conversation-v1";
type ConversationTarget = { profileId: string; bindingId: string; connectionKey: string };
export function parseLastConversation(raw: string): ConversationTarget {
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value.profileId !== "string" ||
    !value.profileId ||
    value.profileId.length > 100 ||
    typeof value.bindingId !== "string" ||
    !value.bindingId ||
    value.bindingId.length > 200 ||
    typeof value.connectionKey !== "string" ||
    !/^[a-f0-9]{24}$/.test(value.connectionKey)
  )
    throw new Error("Invalid recent conversation reference");
  return { profileId: value.profileId, bindingId: value.bindingId, connectionKey: value.connectionKey };
}
const project = (session: Session) => session.cwd.split(/[\\/]/).filter(Boolean).pop() || session.cwd || "No project";
const title = (session: Session) => session.name || project(session);
export function sessionStatus(session: Session): string {
  if (session.revoked) return "Unbound";
  if (!session.online || session.status === "offline") return "Offline";
  if (session.uncertainMessageId) return "Check Agent";
  return {
    ready: "Ready",
    busy: "Working",
    waiting: "Needs Input",
    connecting: "Connecting",
    unknown: "Check Agent",
    error: "Needs Attention",
  }[session.status];
}
export function sessionGroup(session: Session): "Needs Attention" | "Online" | "Offline" {
  if (session.revoked || !session.online || session.status === "offline") return "Offline";
  return session.uncertainMessageId || ["waiting", "unknown", "error"].includes(session.status)
    ? "Needs Attention"
    : "Online";
}
export function orderedSessions<T extends Session>(sessions: readonly T[]): T[] {
  const groups = ["Needs Attention", "Online", "Offline"];
  return [...sessions].sort(
    (a, b) =>
      groups.indexOf(sessionGroup(a)) - groups.indexOf(sessionGroup(b)) ||
      b.updatedAt - a.updatedAt ||
      a.name.localeCompare(b.name),
  );
}
const statusColor = (session: Session) =>
  sessionGroup(session) === "Offline"
    ? Color.SecondaryText
    : sessionGroup(session) === "Needs Attention"
      ? session.status === "error"
        ? Color.Red
        : Color.Orange
      : session.status === "ready"
        ? Color.Green
        : Color.Orange;
const knownOnline = (session: Session) =>
  session.online && !session.revoked && ["ready", "busy", "waiting"].includes(session.status);

export function messageStatus(message: Message): { label: string; explanation: string } {
  switch (message.state) {
    case "queued":
      return {
        label: "Queued",
        explanation: "Saved in the hub queue; not yet received by the Agent. It waits for the Agent to be ready.",
      };
    case "submitted":
      return {
        label: "Agent Receiving",
        explanation: "Forwarded to the Agent connection; receipt and completion are not yet confirmed.",
      };
    case "accepted":
      return {
        label: "Processing",
        explanation:
          message.role === "assistant"
            ? "The Agent is writing this reply; it may still change."
            : "The Agent acknowledged this message and is processing it. Completion is not yet confirmed.",
      };
    case "completed":
      return {
        label: "Completed",
        explanation:
          message.role === "assistant"
            ? "The Agent finished this reply."
            : "The Agent reported that this turn completed.",
      };
    case "failed":
      return {
        label: "Failed",
        explanation: "The Agent reported a failure. Review the details and original terminal before retrying.",
      };
    case "unknown":
      return {
        label: "Result Unknown",
        explanation:
          "Argo cannot confirm the result. Check the original Agent before retrying; this message is never replayed automatically.",
      };
  }
}

function PreferencesAction() {
  return <Action title="Open Argo Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}

function SessionList({ notice }: { notice?: string }) {
  const feed = useBridges();
  const { push } = useNavigation();
  const discovered = useRef(false);
  useEffect(() => {
    if (!feed.loading && !feed.error && feed.savedCount === 0 && feed.defaultUnavailable && !discovered.current) {
      discovered.current = true;
      push(<DiscoverBridges onConnected={feed.reconnect} />);
    }
  }, [feed.loading, feed.error, feed.savedCount, feed.defaultUnavailable, push, feed.reconnect]);
  const discoverAction = (
    <Action.Push
      title="Find Forwarded Bridges"
      icon={Icon.MagnifyingGlass}
      target={<DiscoverBridges onConnected={feed.reconnect} />}
    />
  );
  const setupAction = (
    <Action.Push
      title="Connection Setup"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<Setup onConnected={feed.reconnect} />}
    />
  );
  const actions = (
    <ActionPanel>
      {discoverAction}
      {setupAction}
      <Action
        title="Refresh Sessions"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={feed.reconnect}
      />
      <PreferencesAction />
    </ActionPanel>
  );
  const sessions = orderedSessions(
    feed.bridges.flatMap((bridge) =>
      bridge.sessions.map((session) => ({
        ...session,
        online: session.online && bridge.connection !== "offline" && !bridge.error,
        bridge,
      })),
    ),
  );
  return (
    <List
      isLoading={feed.loading}
      navigationTitle="Argo · All Sessions"
      searchBarPlaceholder="Find a session, project, machine, bridge, or Agent"
      actions={actions}
    >
      <List.EmptyView
        title="No Matching Sessions"
        description="Try the session name, project, machine, or bridge. Clear search to connect another Agent."
        icon={Icon.MagnifyingGlass}
      />
      {notice ? <List.Item id="recent-notice" title={notice} icon={Icon.Info} actions={actions} /> : null}
      {feed.error ? (
        <List.Item
          id="connection-recovery"
          title="Saved Bridges Need Attention"
          subtitle={feed.error}
          icon={Icon.Warning}
          actions={actions}
        />
      ) : null}
      {!sessions.length && !feed.loading ? (
        <List.Item
          id="no-sessions"
          title="No Agents Connected Yet"
          subtitle="Find a forwarded server bridge or connect an existing terminal Agent"
          icon={Icon.Terminal}
          actions={actions}
        />
      ) : null}
      {["Needs Attention", "Online", "Offline"].map((group) => {
        const entries = sessions.filter((session) => sessionGroup(session) === group);
        return entries.length ? (
          <List.Section
            key={group}
            title={group}
            subtitle={`${entries.length} session${entries.length === 1 ? "" : "s"}`}
          >
            {entries.map((session) => (
              <List.Item
                key={`${session.bridge.profile.id}:${session.id}`}
                id={`${session.bridge.profile.id}:${session.id}`}
                title={title(session)}
                subtitle={`${project(session)} · ${session.machine} · ${session.bridge.profile.name}`}
                keywords={[session.machine, session.adapter, session.name, session.cwd, session.bridge.profile.name]}
                icon={{ source: Icon.Terminal, tintColor: statusColor(session) }}
                accessories={[
                  { text: session.adapter === "claude" ? "Claude" : "Codex" },
                  {
                    date: new Date(session.updatedAt),
                    tooltip: `Latest activity: ${new Date(session.updatedAt).toLocaleString()}`,
                  },
                  { tag: { value: sessionStatus(session), color: statusColor(session) } },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={session.revoked ? "Session Unbound — Open Details" : "Open Conversation"}
                      icon={Icon.Message}
                      onAction={() =>
                        push(
                          <Conversation
                            bindingId={session.id}
                            profileId={session.bridge.profile.id}
                            connectionKey={session.bridge.connectionKey}
                          />,
                        )
                      }
                    />
                    {discoverAction}
                    {setupAction}
                    <Action
                      title="Refresh Sessions"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={feed.reconnect}
                    />
                    <PreferencesAction />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : null;
      })}
      <List.Section title="Connections" subtitle="All saved bridges · Credentials stay in private files">
        {feed.bridges.map((bridge) => (
          <List.Item
            key={bridge.profile.id}
            id={`bridge:${bridge.profile.id}`}
            title={bridge.profile.name}
            subtitle={bridge.error || bridge.address || "Checking private configuration…"}
            icon={{
              source: bridge.error || bridge.connection === "offline" ? Icon.Warning : Icon.Network,
              tintColor: bridge.connection === "live" && !bridge.error ? Color.Green : Color.Orange,
            }}
            accessories={[
              {
                tag:
                  bridge.error || bridge.connection === "offline"
                    ? "Unavailable"
                    : bridge.loading || bridge.connection === "connecting"
                      ? "Connecting"
                      : "Connected",
              },
            ]}
            actions={actions}
          />
        ))}
        <List.Item
          id="find-bridges"
          title="Find Forwarded Bridges"
          subtitle="Scan forwarded ports or copy server setup instructions"
          icon={Icon.MagnifyingGlass}
          actions={actions}
        />
        <List.Item
          id="connect-agent"
          title="Connect Agent…"
          subtitle="Pair an existing Agent or manage bridge connections"
          icon={Icon.Plus}
          keywords={["setup", "pair", "connect", "bridge"]}
          actions={
            <ActionPanel>
              {setupAction}
              {discoverAction}
              <PreferencesAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function Compose({
  text,
  change,
  send,
}: {
  text: string;
  change: (text: string) => void;
  send: (text: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Compose Message"
      isLoading={busy}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Message"
            icon={Icon.ArrowUp}
            onSubmit={async () => {
              if (busy) return;
              setBusy(true);
              try {
                if (await send(value)) pop();
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Your draft is saved on this Mac as you type. Nothing sends automatically, including after reconnecting. Send submits to the hub queue only when the Agent is online; a busy Agent receives it after the current turn." />
      <Form.TextArea
        id="text"
        title="Message"
        value={value}
        onChange={(next) => {
          setValue(next);
          change(next);
        }}
        error={value.length > 100_000 ? "Maximum 100,000 characters" : undefined}
        autoFocus
      />
    </Form>
  );
}

type Respond = (
  request: Interaction,
  answer: { decision: "allow" | "deny" } | { answers: Record<string, string[]> },
) => Promise<boolean>;

function Approval({ request, respond }: { request: Interaction; respond: Respond }) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const pending = request.state === "pending" && request.expiresAt > Date.now();
  async function decide(decision: "allow" | "deny") {
    if (submitting.current || request.state !== "pending" || request.expiresAt <= Date.now()) return;
    submitting.current = true;
    setBusy(true);
    try {
      if (await respond(request, { decision })) pop();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Detail
      navigationTitle="Review Approval"
      isLoading={busy}
      markdown={`# ${safeMarkdown(request.title)}\n\n**${pending ? "Pending approval — review all parameters before allowing." : "This request is no longer pending."}**\n\n${safeMarkdown(request.detail)}\n\nExpires: ${new Date(request.expiresAt).toLocaleString()}`}
      actions={
        <ActionPanel>
          {pending ? (
            <>
              <Action title="Allow Request" icon={Icon.Checkmark} onAction={() => decide("allow")} />
              <Action
                title="Deny Request"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => decide("deny")}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function Questions({ request, respond }: { request: Interaction; respond: Respond }) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const questions = request.questions || [];
  return (
    <Form
      navigationTitle="Answer Agent Questions"
      isLoading={busy}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Answers"
            icon={Icon.ArrowUp}
            onSubmit={async (values: Record<string, string[] | string>) => {
              if (busy) return;
              if (request.state !== "pending" || request.expiresAt <= Date.now()) {
                setError("This request has expired. Refresh the conversation.");
                return;
              }
              const answers: Record<string, string[]> = Object.create(null);
              for (const [index, question] of questions.entries()) {
                const selected = values[`options-${index}`];
                const custom = values[`custom-${index}`];
                answers[question.id] = [
                  ...(Array.isArray(selected) ? selected : []),
                  ...(typeof custom === "string" && custom.trim() ? [custom.trim()] : []),
                ];
                if (!answers[question.id]!.length) {
                  setError("Answer every question before submitting.");
                  return;
                }
                if (
                  answers[question.id]!.length > 50 ||
                  answers[question.id]!.some((answer) => answer.length > 10_000)
                ) {
                  setError("Maximum 50 answers per question and 10,000 characters per answer.");
                  return;
                }
              }
              if (!questions.length) {
                setError("No questions were provided. Refresh the conversation.");
                return;
              }
              setBusy(true);
              try {
                if (await respond(request, { answers })) pop();
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={request.title}
        text={request.detail || "Select options and/or enter your own answer for each question."}
      />
      {error ? <Form.Description title="Cannot Submit" text={error} /> : null}
      {questions.map((question, index) => (
        <Fragment key={question.id}>
          <Form.Description text={question.question} />
          {question.options.length ? (
            <Form.TagPicker id={`options-${index}`} title="Select Answers">
              {question.options.map((option, optionIndex) => (
                <Form.TagPicker.Item key={optionIndex} value={option} title={option} />
              ))}
            </Form.TagPicker>
          ) : null}
          <Form.TextArea id={`custom-${index}`} title="Your Answer" placeholder="Optional when options are selected" />
        </Fragment>
      ))}
    </Form>
  );
}

type ConversationSelection = { generation?: string; selectedItemId?: string; replyTo?: string };
type SelectionEvent =
  | { type: "snapshot"; generation: string; messages: readonly Message[] }
  | { type: "send"; messageId: string }
  | { type: "select"; id: string | null }
  | { type: "latest"; messages: readonly Message[] };

export function conversationSelection(state: ConversationSelection, event: SelectionEvent): ConversationSelection {
  if (event.type === "send") return { ...state, replyTo: event.messageId };
  if (event.type === "latest") {
    const latest = event.messages
      .filter((message) => message.role === "assistant")
      .reduce<Message | undefined>(
        (newest, message) => (!newest || message.createdAt > newest.createdAt ? message : newest),
        undefined,
      );
    return latest ? { ...state, selectedItemId: latest.id, replyTo: undefined } : state;
  }
  if (event.type === "select") {
    // Loading defaults and callbacks acknowledging our own selection aren't user navigation.
    if (!state.generation || event.id === null || event.id === state.selectedItemId) return state;
    return { ...state, selectedItemId: event.id, replyTo: undefined };
  }
  const initial = state.generation !== event.generation;
  const candidates = event.messages.filter(
    (message) =>
      message.role === "assistant" && (initial || Boolean(state.replyTo && message.replyTo === state.replyTo)),
  );
  const latest = (messages: readonly Message[]) =>
    messages.reduce<Message | undefined>(
      (newest, message) => (!newest || message.createdAt > newest.createdAt ? message : newest),
      undefined,
    );
  const selectedItemId =
    latest(candidates)?.id ?? (initial ? (latest(event.messages)?.id ?? "empty") : state.selectedItemId);
  if (initial) return { generation: event.generation, selectedItemId };
  return selectedItemId === state.selectedItemId ? state : { ...state, selectedItemId };
}

export function sendUnavailable(session: Session | undefined, live: boolean): string | undefined {
  if (!live) return "Bridge unavailable. Your draft stays on this Mac; reconnect before sending.";
  if (!session || session.revoked)
    return "This session is no longer available. Choose another session or connect the Agent again.";
  if (!knownOnline(session))
    return session.online
      ? "Check the original Agent and refresh its status before sending. Your draft is kept."
      : "Agent offline. Your draft is kept; reconnect the original Agent before sending.";
  if (!session.capabilities.send) return "This Agent connection cannot receive messages. Your draft is kept.";
}

function Conversation({
  bindingId,
  profileId,
  connectionKey,
}: {
  bindingId: string;
  profileId: string;
  connectionKey?: string;
}) {
  const feed = useHub(bindingId, profileId, connectionKey);
  const { push } = useNavigation();
  const [identity, setIdentity] = useState(connectionKey);
  if (!identity && feed.connectionKey) setIdentity(feed.connectionKey);
  const connectionChanged = Boolean(identity && feed.connectionKey && identity !== feed.connectionKey);
  const draft = useDraft(bindingId, identity);
  const latestSend = useRef<(text: string, generation?: string) => Promise<boolean>>(async () => false);
  const [busy, setBusy] = useState(false);
  const [detached, setDetached] = useState(false);
  const lock = useRef(false);
  const [older, setOlder] = useState<Message[]>([]);
  const [more, setMore] = useState<boolean>();
  const [selection, setSelection] = useState<ConversationSelection>({});
  const snapshot = connectionChanged ? undefined : feed.snapshot;
  const session = snapshot?.session;
  const generation = session?.generation;
  const currentSelection = snapshot
    ? conversationSelection(selection, {
        type: "snapshot",
        generation: snapshot.session.generation,
        messages: snapshot.messages,
      })
    : selection;
  // Resolve before rendering List so its first selected item isn't the status row.
  if (currentSelection !== selection) setSelection(currentSelection);
  useEffect(() => {
    setOlder([]);
    setMore(undefined);
  }, [generation, identity]);
  useEffect(() => {
    if (!identity || connectionChanged || !session || session.revoked) return;
    void Promise.all([
      LocalStorage.setItem(recentKey(identity), bindingId),
      LocalStorage.setItem(LAST_CONVERSATION_KEY, JSON.stringify({ profileId, bindingId, connectionKey: identity })),
    ]).catch(() => showToast({ style: Toast.Style.Failure, title: "Could not save the recent session" }));
  }, [bindingId, profileId, identity, connectionChanged, session?.generation]);

  async function run(operation: () => Promise<void>, success: string): Promise<boolean> {
    if (lock.current) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Another Request Is Still Running",
        message: "Your draft is kept. Wait for the current request before trying again.",
      });
      return false;
    }
    lock.current = true;
    setBusy(true);
    try {
      await operation();
      await showToast({
        style: Toast.Style.Success,
        title: success,
        message: "Submitted to the hub; agent completion is reported separately.",
      });
      await feed.refresh();
      return true;
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: cause instanceof HubError ? "Request rejected" : "Delivery unknown",
        message:
          cause instanceof HubError
            ? cause.message
            : "Refresh before retrying. A retry of the same message uses its original ID.",
      });
      await feed.refresh();
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function send(text: string, expectedGeneration?: string): Promise<boolean> {
    const unavailable = connectionChanged
      ? "Bridge connection changed. Open this session again from All Sessions; your original draft is kept."
      : expectedGeneration && expectedGeneration !== generation
        ? "This Agent session changed while composing. Your draft is kept. Reopen Compose before sending."
        : detached
          ? "This session was unbound. Connect an Agent before sending."
          : !draft.ready
            ? "Your local draft is still loading. Wait before sending."
            : sendUnavailable(session, Boolean(feed.hub.current && feed.connection === "live" && !feed.error));
    if (unavailable || !session) {
      await showToast({ style: Toast.Style.Failure, title: "Message Not Sent", message: unavailable });
      return false;
    }
    if (!text.trim() || text.length > 100_000) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a message of 1–100,000 characters" });
      return false;
    }
    const client = feed.hub.current!;
    const sent = await run(
      async () => {
        let attempt;
        try {
          attempt = await draft.prepare(text, session.generation);
        } catch (cause) {
          const error = new HubError(0);
          error.message = cause instanceof Error ? cause.message : "Could not save the pending message locally.";
          throw error;
        }
        // Arm before I/O: a reply can arrive through the subscription before POST resolves.
        setSelection((previous) => conversationSelection(previous, { type: "send", messageId: attempt.id }));
        return client.mutate(bindingId, "/messages", {
          messageId: attempt.id,
          generation: attempt.generation,
          text,
        });
      },
      session.status === "ready" ? "Message queued for Agent" : "Queued — waiting for Agent",
    );
    if (sent) {
      await draft.clearIf(text);
    }
    return sent;
  }
  latestSend.current = send;
  const respond: Respond = async (request, answer) => {
    const client = feed.hub.current;
    if (connectionChanged || !session || !client) return false;
    // Re-read before approval/question submission; a Detail/Form may have remained open across a rebind.
    return run(async () => {
      const current = await client.snapshot(bindingId);
      const fresh = current.interactions.find((item) => item.requestId === request.requestId);
      if (
        current.session.generation !== session.generation ||
        !knownOnline(current.session) ||
        !fresh ||
        fresh.state !== "pending" ||
        fresh.expiresAt <= Date.now() ||
        fresh.kind !== request.kind ||
        fresh.title !== request.title ||
        fresh.detail !== request.detail ||
        JSON.stringify(fresh.questions) !== JSON.stringify(request.questions)
      )
        throw new HubError(409);
      await client.mutate(bindingId, `/interactions/${encodeURIComponent(request.requestId)}`, {
        generation: session.generation,
        ...answer,
      });
    }, "Response submitted");
  };

  const canAct = Boolean(
    !connectionChanged &&
    !detached &&
    session &&
    knownOnline(session) &&
    feed.connection === "live" &&
    !feed.error &&
    !busy,
  );
  const canSend = Boolean(canAct && session?.capabilities.send && draft.ready);
  const sendTitle = session && ["busy", "waiting"].includes(session.status) ? "Queue Message" : "Send Message";
  const allMessages = [
    ...new Map([...older, ...(snapshot?.messages || [])].map((message) => [message.id, message])).values(),
  ].sort((a, b) => b.createdAt - a.createdAt);
  async function loadOlder() {
    if (connectionChanged || !feed.hub.current || lock.current || !allMessages.length) return;
    lock.current = true;
    setBusy(true);
    try {
      const page = await feed.hub.current.snapshot(
        bindingId,
        Math.min(...allMessages.map((message) => message.createdAt)),
      );
      if (page.session.generation !== generation) {
        setOlder([]);
        await feed.refresh();
        return;
      }
      setOlder((previous) => [
        ...new Map([...previous, ...page.messages].map((message) => [message.id, message])).values(),
      ]);
      setMore(page.hasMore);
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load older messages",
        message: errorText(cause),
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function detach() {
    const client = feed.hub.current;
    if (
      connectionChanged ||
      !session ||
      !client ||
      !(await confirmAlert({
        title: "Unbind this terminal session?",
        message: `${title(session)}\nThis revokes the binding, not the terminal agent itself.`,
        primaryAction: { title: "Unbind Session", style: Alert.ActionStyle.Destructive },
        dismissAction: { title: "Cancel" },
      }))
    )
      return;
    if (await run(() => client.mutate(bindingId, "", undefined, "DELETE"), "Session unbound")) {
      setDetached(true);
      draft.change("");
      try {
        if (identity && (await LocalStorage.getItem<string>(recentKey(identity))) === bindingId)
          await LocalStorage.removeItem(recentKey(identity));
        const raw = await LocalStorage.getItem<string>(LAST_CONVERSATION_KEY);
        if (raw) {
          const saved = parseLastConversation(raw);
          if (saved.profileId === profileId && saved.bindingId === bindingId && saved.connectionKey === identity)
            await LocalStorage.removeItem(LAST_CONVERSATION_KEY);
        }
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Unbound, but could not clear the recent binding" });
      }
    }
  }
  function commonActions() {
    return (
      <>
        {draft.text.trim() ? (
          <Action
            title={canSend ? sendTitle : "Send Message (Unavailable)"}
            icon={Icon.ArrowUp}
            onAction={() => latestSend.current(draft.text)}
          />
        ) : null}
        <Action
          title={canSend ? "Compose Message" : "Compose Local Draft"}
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => {
            if (!draft.ready) {
              void showToast({
                style: Toast.Style.Failure,
                title: "Draft Storage Not Ready",
                message: "Wait for your draft to restore, or use Connection Setup to configure a bridge first.",
              });
              return;
            }
            push(
              <Compose text={draft.text} change={draft.change} send={(text) => latestSend.current(text, generation)} />,
            );
          }}
        />
        <Action
          title="Jump to Latest Reply"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd"], key: "j" }}
          onAction={() => {
            if (!allMessages.some((message) => message.role === "assistant")) {
              void showToast({
                style: Toast.Style.Failure,
                title: "No Agent Replies Yet",
                message: "A reply will appear after the Agent receives and processes a message.",
              });
              return;
            }
            setSelection((previous) => conversationSelection(previous, { type: "latest", messages: allMessages }));
          }}
        />
        {!connectionChanged && session?.online && session.uncertainMessageId && feed.connection === "live" && !busy ? (
          <Action
            title="Resume Queue After Checking Agent…"
            icon={Icon.Play}
            onAction={async () => {
              const client = feed.hub.current;
              if (
                client &&
                (await confirmAlert({
                  title: "Have you checked the original Agent?",
                  message:
                    "Confirm the Agent is idle and inspect the uncertain prompt's result. This releases queued prompts without replaying or completing the uncertain one.",
                  primaryAction: { title: "I Checked, Resume Queue", style: Alert.ActionStyle.Destructive },
                }))
              ) {
                await run(
                  () =>
                    client.mutate(bindingId, "/reconcile", {
                      generation: session.generation,
                      messageId: session.uncertainMessageId,
                    }),
                  "Queue resumed",
                );
              }
            }}
          />
        ) : null}
        <Action
          title="Refresh Conversation"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={feed.reconnect}
        />
        <Action.Push title="All Sessions" icon={Icon.List} target={<SessionList />} />
        <Action.Push title="Connection Setup" icon={Icon.Gear} target={<Setup onConnected={feed.reconnect} />} />
        <Action.Push
          title="Session Status & Help"
          icon={Icon.Info}
          target={
            <Detail
              navigationTitle="Session Status & Help"
              markdown={`# ${safeMarkdown(session ? sessionStatus(session) : "Session unavailable")}\n\n${safeMarkdown(feed.error || session?.detail || "Sending is an explicit action. Busy Agents receive queued messages after the current turn.")}\n\nDrafts stay on this Mac and are never sent automatically. Unknown results must be checked in the original Agent before retrying. Images and links in Agent content are inert.`}
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="Bridge" text={feed.profileName} />
                  <Detail.Metadata.Label
                    title="Connection"
                    text={
                      feed.connection === "live"
                        ? "Connected"
                        : feed.connection === "connecting"
                          ? "Connecting"
                          : "Offline"
                    }
                  />
                  {session ? (
                    <>
                      <Detail.Metadata.Label title="Agent" text={session.adapter === "claude" ? "Claude" : "Codex"} />
                      <Detail.Metadata.Label title="Machine" text={session.machine} />
                      <Detail.Metadata.Label title="Project" text={session.cwd} />
                    </>
                  ) : null}
                </Detail.Metadata>
              }
            />
          }
        />
        {canAct && session?.capabilities.interrupt ? (
          <Action
            title="Interrupt Agent…"
            icon={Icon.Stop}
            onAction={async () => {
              const client = feed.hub.current;
              if (
                client &&
                (await confirmAlert({
                  title: "Interrupt this agent?",
                  message: title(session),
                  primaryAction: { title: "Interrupt", style: Alert.ActionStyle.Destructive },
                }))
              ) {
                await run(
                  () => client.mutate(bindingId, "/interrupt", { generation: session.generation }),
                  "Interrupt submitted",
                );
              }
            }}
          />
        ) : null}
        {!connectionChanged && session && !session.revoked && !detached && !busy ? (
          <Action title="Unbind Session…" style={Action.Style.Destructive} icon={Icon.Trash} onAction={detach} />
        ) : null}
        <PreferencesAction />
      </>
    );
  }
  const unavailable =
    connectionChanged ||
    detached ||
    !session ||
    Boolean(feed.error) ||
    feed.connection === "offline" ||
    !knownOnline(session);
  const stateText = connectionChanged
    ? "Bridge Connection Changed"
    : detached
      ? "Session Unbound"
      : feed.error || feed.connection === "offline"
        ? "Bridge Unavailable"
        : session
          ? sessionStatus(session)
          : "Session Unavailable";
  return (
    <List
      navigationTitle={session ? `${title(session)} · ${project(session)}` : "Argo Conversation"}
      isLoading={feed.loading || busy}
      selectedItemId={
        currentSelection.selectedItemId === "empty" && unavailable
          ? "connection-status"
          : currentSelection.selectedItemId
      }
      onSelectionChange={(id) => setSelection((previous) => conversationSelection(previous, { type: "select", id }))}
      filtering={false}
      isShowingDetail
      searchText={draft.text}
      onSearchTextChange={(text) => {
        if (draft.ready) draft.change(text);
      }}
      searchBarPlaceholder={
        canSend
          ? "Draft a message · Enter to send · ⌘N for multiline"
          : "Local draft — sending requires a connected Agent"
      }
      actions={<ActionPanel>{commonActions()}</ActionPanel>}
    >
      <List.EmptyView
        title="Loading Conversation"
        description="Restoring your local draft and the latest Agent reply…"
        icon={Icon.Message}
      />
      {unavailable && !feed.loading ? (
        <List.Item
          id="connection-status"
          title={stateText}
          subtitle="Your draft is kept on this Mac"
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`## ${safeMarkdown(stateText)}\n\n${safeMarkdown(connectionChanged ? "Open All Sessions to choose a session on the current bridge. This view keeps the original bridge’s draft and cannot send to a different connection." : feed.error || sendUnavailable(session, feed.connection === "live") || session?.detail || "Reconnect or choose another session.")}`}
            />
          }
          actions={<ActionPanel>{commonActions()}</ActionPanel>}
        />
      ) : null}
      {!feed.loading && !unavailable && !allMessages.length && !snapshot?.interactions.length ? (
        <List.Item
          id="empty"
          title="Start a Conversation"
          subtitle="Compose a message to your existing Agent"
          icon={Icon.Message}
          detail={
            <List.Item.Detail markdown="## Your Agent replies appear here\n\nPress **⌘N** to compose a message, or type a short draft in the search bar. Sending is always explicit; reconnecting never sends a draft." />
          }
          actions={<ActionPanel>{commonActions()}</ActionPanel>}
        />
      ) : null}
      {(snapshot?.interactions || []).map((request) => {
        const pending = request.state === "pending" && request.expiresAt > Date.now();
        const supported =
          request.kind === "approval" ? session?.capabilities.approvals : session?.capabilities.questions;
        return (
          <List.Item
            key={request.requestId}
            id={`request:${request.requestId}`}
            title={`${request.kind === "approval" ? "Approval" : "Question"}: ${request.title}`}
            subtitle={pending ? "Pending" : request.state === "pending" ? "expired" : request.state}
            icon={request.kind === "approval" ? Icon.Shield : Icon.QuestionMarkCircle}
            detail={
              <List.Item.Detail
                markdown={`# ${safeMarkdown(request.title)}\n\n${safeMarkdown(request.detail)}\n\nState: ${pending ? "pending" : request.state === "pending" ? "expired" : request.state}`}
              />
            }
            actions={
              <ActionPanel>
                {canAct && pending && supported ? (
                  <Action.Push
                    title={request.kind === "approval" ? "Review Approval" : "Answer Questions"}
                    target={
                      request.kind === "approval" ? (
                        <Approval request={request} respond={respond} />
                      ) : (
                        <Questions request={request} respond={respond} />
                      )
                    }
                  />
                ) : null}
                {commonActions()}
              </ActionPanel>
            }
          />
        );
      })}
      <List.Section title="Conversation" subtitle="Latest first">
        {allMessages.map((message) => {
          const state = messageStatus(message);
          return (
            <List.Item
              key={message.id}
              id={message.id}
              title={message.text.replace(/\s+/g, " ").slice(0, 100) || "Empty message"}
              subtitle={state.label}
              accessories={[{ text: message.role === "user" ? "You" : "Agent" }]}
              icon={message.role === "user" ? Icon.Person : Icon.Message}
              detail={
                <List.Item.Detail
                  markdown={safeMarkdown(message.text)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title={message.role === "user" ? "You" : "Agent"}
                        text={new Date(message.createdAt).toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label title="Status" text={state.label} />
                      <List.Item.Detail.Metadata.Label title="Meaning" text={state.explanation} />
                      {message.detail ? (
                        <List.Item.Detail.Metadata.Label title="Details" text={message.detail} />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {commonActions()}
                  <Action.CopyToClipboard
                    title="Copy Selected Message"
                    content={message.text}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {(more ?? snapshot?.hasMore) && allMessages.length ? (
        <List.Item
          id="older"
          title="Load Earlier Messages"
          icon={Icon.Clock}
          detail={
            <List.Item.Detail markdown="The hub returns the latest 200 messages by default. Load an earlier page explicitly." />
          }
          actions={
            <ActionPanel>
              <Action title="Load Earlier Messages" icon={Icon.Clock} onAction={loadOlder} />
              {commonActions()}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

export function SessionCommand({ bindingId, profileId, connectionKey: expectedKey, recent = true }: Context) {
  const [target, setTarget] = useState<ConversationTarget>();
  const [loading, setLoading] = useState(Boolean(recent || bindingId));
  const [notice, setNotice] = useState<string>();
  const { configPath, portStart, portEnd } = getPreferenceValues<Preferences>();
  useEffect(() => {
    if (!recent && !bindingId) return;
    let active = true;
    let hub: Hub | undefined;
    setLoading(true);
    setTarget(undefined);
    void (async () => {
      try {
        if (bindingId && !profileId) {
          setNotice("Session Link Has No Bridge — Choose the Intended Session Below");
          return;
        }
        const raw = !bindingId ? await LocalStorage.getItem<string>(LAST_CONVERSATION_KEY) : undefined;
        if (!active) return;
        const saved = raw ? parseLastConversation(raw) : undefined;
        const selectedId = saved?.profileId ?? profileId;
        const loaded = await loadConnection(LocalStorage, configPath, selectedId, portRange(portStart, portEnd));
        if (!active) return;
        const { config, connectionKey, profile } = loaded;
        if ((saved?.connectionKey ?? expectedKey) && (saved?.connectionKey ?? expectedKey) !== connectionKey) {
          setNotice("Recent Bridge Identity Changed — Choose a Session Below");
          return;
        }
        const id = bindingId ?? saved?.bindingId ?? (await LocalStorage.getItem<string>(recentKey(connectionKey)));
        if (!active) return;
        if (!id) {
          setNotice("No Recent Session — Choose One Below");
          return;
        }
        hub = new Hub(config);
        const { sessions } = await hub.sessions();
        if (!active) return;
        if (!sessions.some((session) => session.id === id && !session.revoked)) {
          if (saved && (await LocalStorage.getItem<string>(LAST_CONVERSATION_KEY)) === raw)
            await LocalStorage.removeItem(LAST_CONVERSATION_KEY);
          else if (!saved && !bindingId) await LocalStorage.removeItem(recentKey(connectionKey));
          if (active) setNotice("Recent Session No Longer Available — Choose Another");
          return;
        }
        setTarget({ bindingId: id, profileId: profile.id, connectionKey });
      } catch {
        if (active) setNotice("Could Not Open Recent Session — Reconnect or Choose Below");
      } finally {
        hub?.close();
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      hub?.close();
    };
  }, [bindingId, profileId, expectedKey, recent, configPath, portStart, portEnd]);
  if (loading) return <List isLoading navigationTitle="Argo · Recent Session" />;
  return target ? (
    <Conversation key={`${target.profileId}:${target.connectionKey}:${target.bindingId}`} {...target} />
  ) : (
    <SessionList notice={notice} />
  );
}

export default function Sessions(props: LaunchProps<{ launchContext: Context }>) {
  return <SessionCommand {...props.launchContext} />;
}
