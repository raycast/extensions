import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { createHash, randomUUID } from "node:crypto";
import { stripVTControlCharacters } from "node:util";
import { HcClient, HcError, hcProgramFingerprint, hcTargetKey } from "./herdr.js";
import type { HcTarget, HcTerminal } from "./herdr.js";
import { Compose } from "./compose.js";
import { literal } from "./interaction-format.js";
import { openHerdr } from "./herdr-connection.js";
import { HcConversation } from "./herdr-conversation.js";
import type { HcTurn } from "./herdr-conversation.js";
import { safeMarkdown } from "./core.js";

export type HcCapture = { text: string; complete: boolean; how: string; why?: string };
export type HcScreen = {
  terminal: HcTerminal;
  capture: HcCapture;
  capturedAt: number;
  event: number;
  stable?: boolean;
};
type InputKind = "task" | "answer" | "terminal";
type Attempt = { id: string; kind: InputKind | "key" | "interrupt"; text?: string; at: number };
type Drafts = { task: string; answer: string; terminal: string };
type Storage = Pick<typeof LocalStorage, "getItem" | "setItem" | "removeItem">;
const hcOperationLocks = new Set<string>();
const MAX_INPUT = 100_000;

export function sanitizeTerminalText(text: string): string {
  return (
    stripVTControlCharacters(text)
      .replace(/\r\n?/g, "\n")
      // eslint-disable-next-line no-control-regex -- terminal control bytes are intentionally removed
      .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "")
  );
}
export function hcScreenFingerprint(screen: HcScreen): string {
  const t = screen.terminal;
  return createHash("sha256")
    .update(
      JSON.stringify([
        hcProgramFingerprint(t),
        t.state,
        t.status ?? null,
        t.reported ?? null,
        t.turn ?? null,
        t.status_ms ?? null,
        t.screen ?? null,
        t.cols ?? null,
        t.rows ?? null,
        t.reason ?? null,
        screen.capture,
        screen.event,
        screen.stable ?? true,
      ]),
    )
    .digest("hex");
}
export function hcReportedReady(terminal: HcTerminal): boolean {
  return terminal.reported === true && ["idle", "done"].includes(terminal.status?.state || "");
}
export function hcStatus(terminal?: HcTerminal): string {
  if (!terminal) return "Connecting";
  if (["lost", "finished", "removed", "restarted"].includes(terminal.state)) return terminal.state;
  return terminal.reported === true && terminal.status
    ? terminal.status.state === "done"
      ? "Ready"
      : terminal.status.state
    : "Unknown · No Status Report";
}
export function hcKeyToken(value: string): string {
  if (!value || value !== value.trim() || /\s/.test(value))
    throw new Error("Enter one key or chord, not text or a sequence.");
  const aliases: Record<string, string> = {
    control: "ctrl",
    meta: "alt",
    opt: "alt",
    cmd: "super",
    return: "enter",
    escape: "esc",
    pgup: "pageup",
    pgdn: "pagedown",
    del: "delete",
  };
  const pieces = value.split("+");
  let key = pieces.pop()!;
  const modifiers = pieces.map((part) => aliases[part] ?? part);
  if (
    modifiers.some((part) => !["ctrl", "shift", "alt", "super"].includes(part)) ||
    new Set(modifiers).size !== modifiers.length
  )
    throw new Error("Use ctrl, shift, alt, or super joined with + and one key.");
  if (/^[A-Z]$/.test(key)) {
    key = key.toLowerCase();
    if (!modifiers.includes("shift")) modifiers.push("shift");
  }
  key = aliases[key] ?? key;
  if (
    !/^(?:[a-z0-9]|[`\\[\],=.';/-]|enter|esc|tab|space|backspace|up|down|left|right|home|end|pageup|pagedown|insert|delete|f[1-9]|f1[0-2])$/.test(
      key,
    )
  )
    throw new Error(
      "Use a letter, digit, named key, f1–f12, or a single chord such as ctrl+d. Use shift+1 for ! or shift+8 for *. Other shifted punctuation also needs a chord. Use space for Space; + and sequences are not supported.",
    );
  return [...["ctrl", "alt", "shift", "super"].filter((part) => modifiers.includes(part)), key].join("+");
}
export function hcScreenMarkdown(screen?: HcScreen, heading?: string): string {
  const title = heading ? `# ${heading}\n\n` : "";
  if (!screen) return `${title}Waiting for a current-screen capture. Nothing is sent automatically.`;
  const capture = screen.capture;
  return (
    `${title}${literal(sanitizeTerminalText(capture.text) || "(Empty screen)")}` +
    `${!capture.complete ? `\n\n**Incomplete capture**${capture.why ? `\n\n${literal(sanitizeTerminalText(capture.why))}` : ""}` : ""}` +
    `${screen.stable === false ? "\n\n**State changed during capture. Refresh before input.**" : ""}` +
    `${heading ? "\n\nColor-only selection/highlighting may be missing; no selected option is inferred." : ""}`
  );
}

function hcMessageMarkdown(turn: HcTurn, user: boolean): string {
  if (user) return safeMarkdown(sanitizeTerminalText(turn.text));
  if (turn.state === "rejected") return "This message was not submitted. Your draft is kept.";
  if (turn.state === "unknown")
    return "Input delivery is uncertain. Inspect the raw terminal before acknowledging; nothing retries automatically.";
  if (!turn.isolated)
    return "This terminal redraw could not be separated reliably into a reply. Use **View Raw Terminal** to inspect it. Earlier screen history is not imported as a message.";
  if (turn.output)
    return `${literal(sanitizeTerminalText(turn.output))}${turn.state === "paused" ? "\n\nCapture paused. Later output is not attributed to this message." : ""}`;
  return turn.state === "paused"
    ? "Capture paused when the view closed or another turn began. Use **View Raw Terminal** for current output."
    : turn.state === "done"
      ? "The terminal reported ready, but no separate reply text was captured. Use **View Raw Terminal**."
      : turn.state === "blocked"
        ? "The Agent needs input. Review the original prompt in Terminal Controls."
        : "Waiting for new terminal output…";
}

// HC has no idempotency key. A durable marker is a stop sign, never an outbox to replay.
export class HcLocalState {
  readonly draftKey: string;
  readonly attemptKey: string;
  drafts: Drafts = { task: "", answer: "", terminal: "" };
  attempt?: Attempt;
  ready = false;
  private writes: Promise<void> = Promise.resolve();
  constructor(
    readonly key: string,
    private storage: Storage,
    private changed: () => void = () => {},
  ) {
    this.draftKey = `hc-drafts-v1:${key}`;
    this.attemptKey = `hc-attempt-v1:${key}`;
  }
  async load() {
    const [draft, pending] = await Promise.all([
      this.storage.getItem<string>(this.draftKey),
      this.storage.getItem<string>(this.attemptKey),
    ]);
    if (draft) {
      const value = JSON.parse(draft);
      if (
        !value ||
        ["task", "answer", "terminal"].some((key) => typeof value[key] !== "string" || value[key].length > MAX_INPUT)
      )
        throw new Error("Invalid HC draft storage. Input is disabled to preserve your saved text.");
      this.drafts = value;
    }
    this.restoreAttempt(pending);
    this.ready = true;
    this.changed();
  }
  private restoreAttempt(pending: string | undefined) {
    this.attempt = undefined;
    if (pending) {
      try {
        const value = JSON.parse(pending);
        if (
          !value ||
          typeof value.id !== "string" ||
          !["task", "answer", "terminal", "key", "interrupt"].includes(value.kind) ||
          typeof value.at !== "number" ||
          (value.text !== undefined && typeof value.text !== "string")
        )
          throw new Error();
        this.attempt = value;
        if (
          ["task", "answer", "terminal"].includes(value.kind) &&
          typeof value.text === "string" &&
          !this.drafts[value.kind as InputKind]
        )
          this.drafts = { ...this.drafts, [value.kind]: value.text };
      } catch {
        this.attempt = {
          id: `unreadable:${createHash("sha256").update(pending).digest("hex")}`,
          kind: "key",
          at: 0,
          text: "Unreadable input journal; inspect the terminal before acknowledging.",
        };
      }
    }
  }
  change(kind: InputKind, text: string) {
    if (!this.ready || text.length > MAX_INPUT) return;
    this.drafts = { ...this.drafts, [kind]: text };
    const saved = JSON.stringify(this.drafts);
    this.writes = this.writes.catch(() => {}).then(() => this.storage.setItem(this.draftKey, saved));
    // Observe rejected writes immediately; flush() still prevents a later mutation.
    void this.writes.catch(() => {});
    this.changed();
  }
  async clearIf(kind: InputKind, text: string) {
    if (this.drafts[kind] === text) this.change(kind, "");
    await this.writes;
  }
  async run<T>(
    kind: Attempt["kind"],
    text: string | undefined,
    preflight: () => Promise<boolean>,
    request: () => Promise<T>,
    active: () => boolean,
  ): Promise<{ sent: boolean; value?: T }> {
    if (hcOperationLocks.has(this.key)) throw new Error("Another terminal operation is running. Nothing was sent.");
    hcOperationLocks.add(this.key);
    let marked = false,
      cleared = false;
    try {
      if (!this.ready) throw new Error("Local input storage is not ready. Nothing was sent.");
      await this.writes;
      if (this.attempt || (await this.storage.getItem<string>(this.attemptKey)))
        throw new Error(
          "Previous input may have reached the terminal. Inspect output and acknowledge uncertainty before another operation.",
        );
      if (!active() || !(await preflight()) || !active()) return { sent: false };
      const attempt: Attempt = { id: randomUUID(), kind, text, at: Date.now() };
      await this.storage.setItem(this.attemptKey, JSON.stringify(attempt));
      this.attempt = attempt;
      marked = true;
      this.changed();
      if (!active()) {
        await this.storage.removeItem(this.attemptKey);
        this.attempt = undefined;
        return { sent: false };
      }
      let value: T;
      try {
        value = await request();
      } catch (cause) {
        // HC rejects blocked/status-mismatch before writing. Keep drafts, not a false delivery lock.
        if (cause instanceof HcError && ["blocked", "changed"].includes(cause.kind)) {
          await this.storage.removeItem(this.attemptKey);
          this.attempt = undefined;
          marked = false;
        }
        throw cause;
      }
      if (kind === "task" || kind === "answer" || kind === "terminal") {
        cleared = this.drafts[kind] === text;
        await this.clearIf(kind, text!);
      }
      await this.storage.removeItem(this.attemptKey);
      this.attempt = undefined;
      return { sent: true, value };
    } catch (cause) {
      if (cleared && (kind === "task" || kind === "answer" || kind === "terminal") && this.drafts[kind] === "") {
        this.change(kind, text!);
        await this.writes.catch(() => {});
      }
      if (marked)
        throw new Error(
          "Delivery is uncertain. Input may already be queued or submitted. Nothing will retry automatically; inspect the screen before acknowledging.",
        );
      throw cause;
    } finally {
      hcOperationLocks.delete(this.key);
      this.changed();
    }
  }
  async acknowledge() {
    if (hcOperationLocks.has(this.key)) throw new Error("Wait for the current operation to finish.");
    hcOperationLocks.add(this.key);
    try {
      const reviewedId = this.attempt?.id;
      const pending = await this.storage.getItem<string>(this.attemptKey);
      this.restoreAttempt(pending);
      this.changed();
      if (!pending) return;
      if (!reviewedId || this.attempt?.id !== reviewedId)
        throw new Error(
          "A different input attempt is now uncertain. Inspect the new attempt and current output before acknowledging. Nothing was unlocked or replayed.",
        );
      await this.storage.removeItem(this.attemptKey);
      this.attempt = undefined;
      this.changed();
    } finally {
      hcOperationLocks.delete(this.key);
    }
  }
}

function useHcScreen(target: HcTarget, visible: boolean) {
  const [screen, setScreen] = useState<HcScreen>();
  const [error, setError] = useState<string>();
  const [invalid, setInvalid] = useState<string>();
  const [loading, setLoading] = useState(true);
  const client = useRef<HcClient | undefined>(undefined);
  const observing = useRef(false);
  const pin = useRef<string | undefined>(undefined);
  const invalidRef = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  const showing = useRef(visible);
  showing.current = visible;
  const refreshRef = useRef<(fresh?: boolean) => Promise<HcScreen>>(async () => {
    throw new Error("HC is not connected.");
  });
  const latest = useRef<HcScreen | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    let stopped = false,
      event = 0;
    let current: HcClient | undefined, stopObserve: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: Promise<HcScreen> | undefined;
    const invalidate = (message: string) => {
      invalidRef.current = message;
      if (!stopped) setInvalid(message);
    };
    const read = async (fresh = false): Promise<HcScreen> => {
      while (pending) {
        const previous = pending;
        await previous;
        if (!fresh) return previous;
      }
      if (!current || stopped) throw new Error("HC is disconnected. Reconnect and review this target again.");
      const connection = current;
      pending = (async () => {
        const startEvent = event;
        const before = await connection.get(target);
        const capture = await connection.read(target, 0);
        const terminal = await connection.get(target);
        if (stopped || connection !== client.current) throw new Error("This terminal view is closed.");
        const fingerprint = hcProgramFingerprint(terminal);
        if (!pin.current) pin.current = hcProgramFingerprint(before);
        if (
          hcProgramFingerprint(before) !== fingerprint ||
          pin.current !== fingerprint ||
          ["lost", "finished", "removed", "restarted"].includes(terminal.state)
        )
          invalidate("The terminal program changed or ended. Start a new review before sending input.");
        const stable =
          hcScreenFingerprint({ terminal: before, capture, capturedAt: 0, event: startEvent }) ===
          hcScreenFingerprint({ terminal, capture, capturedAt: 0, event });
        const next = { terminal, capture, capturedAt: Date.now(), event, stable };
        latest.current = next;
        setScreen(next);
        setError(undefined);
        return next;
      })();
      try {
        return await pending;
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : "Cannot capture the terminal screen.");
        throw cause;
      } finally {
        pending = undefined;
        if (!stopped) setLoading(false);
      }
    };
    refreshRef.current = read;
    const poll = async () => {
      if (stopped) return;
      if (showing.current && !hcOperationLocks.has(hcTargetKey(target))) await read().catch(() => {});
      if (!stopped) timer = setTimeout(poll, 1800);
    };
    void (async () => {
      try {
        const connected = await HcClient.connect(target.socketPath);
        if (stopped) {
          connected.close();
          return;
        }
        if (connected.core.id !== target.hostCoreId) {
          connected.close();
          throw new Error("The HC host identity changed. Choose this target again from All Sessions.");
        }
        current = connected;
        client.current = connected;
        await read();
        const stop = await connected.observe(
          (change) => {
            const address = change?.terminal;
            const selected =
              !address ||
              address === `${target.coreId}/${target.terminalId}` ||
              address === latest.current?.terminal.address ||
              (target.coreId === target.hostCoreId && address === target.terminalId);
            if (!selected) return;
            if (change?.type !== "snapshot") event++;
            if (change && ["lost", "restarted", "finished", "removed"].includes(change.type))
              invalidate("The terminal program changed or ended. Start a new review before sending input.");
            if (showing.current && !hcOperationLocks.has(hcTargetKey(target))) void read().catch(() => {});
          },
          () => {
            observing.current = false;
            invalidate("HC disconnected. The old interaction is disabled; reconnect and start a new review.");
            current = undefined;
            if (client.current === connected) client.current = undefined;
            connected.close();
            if (!stopped) setError("HC event connection disconnected. Output is stale.");
          },
        );
        if (stopped) {
          stop();
          return;
        }
        stopObserve = stop;
        observing.current = true;
        setLoading(false);
        timer = setTimeout(poll, 1800);
      } catch (cause) {
        observing.current = false;
        current?.close();
        current = undefined;
        client.current = undefined;
        invalidate("HC could not establish a live subscription. Reconnect and start a new review.");
        if (!stopped) {
          setError(cause instanceof Error ? cause.message : "Cannot connect to Herdr Core.");
          setLoading(false);
        }
      }
    })();
    return () => {
      stopped = true;
      mounted.current = false;
      observing.current = false;
      clearTimeout(timer);
      stopObserve?.();
      current?.close();
      current = undefined;
      client.current?.close();
      client.current = undefined;
    };
  }, [hcTargetKey(target)]);
  return {
    screen,
    error,
    invalid,
    loading,
    client,
    observing,
    pin,
    latest,
    mounted,
    invalidRef,
    refresh: (fresh = false) => refreshRef.current(fresh),
  };
}

function CustomKey({ choose }: { choose: (key: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();
  const done = useRef(false);
  useEffect(
    () => () => {
      done.current = true;
    },
    [],
  );
  return (
    <Form
      navigationTitle="Choose One Terminal Key"
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Key"
            icon={Icon.Eye}
            onSubmit={() => {
              if (done.current) return;
              try {
                const token = hcKeyToken(value);
                if (token === "ctrl+c")
                  throw new Error(
                    "Use Interrupt Terminal instead. It uses HC's interrupt operation and reports the actual outcome.",
                  );
                choose(token);
                done.current = true;
                pop();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Invalid key");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="One key or chord only. This form sends nothing; review the screen and explicitly send the key next. Uppercase A becomes shift+a. No appended Enter or key sequences." />
      <Form.TextField
        id="key"
        title="Key or Chord"
        value={value}
        onChange={setValue}
        placeholder="y, 1, shift+tab, ctrl+d"
        error={error}
        autoFocus
      />
    </Form>
  );
}

function HcCompose({
  send,
  ...props
}: Omit<React.ComponentProps<typeof Compose>, "send"> & {
  send: (text: string, active: () => boolean) => Promise<boolean>;
}) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return <Compose {...props} send={(text) => send(text, () => active.current)} />;
}

type Mode = "output" | "controls" | "text";
type TextReview = { kind: "answer" | "terminal"; text: string };
const keyRows = [
  ["up", "Send Up"],
  ["down", "Send Down"],
  ["tab", "Send Tab"],
  ["shift+tab", "Send Shift+Tab"],
  ["left", "Send Left"],
  ["right", "Send Right"],
  ["enter", "Send Enter"],
  ["esc", "Send Escape"],
] as const;

export function HerdrSession({
  target,
  onAllSessions,
}: {
  target: HcTarget;
  onAllSessions?: (onPop?: () => void) => void;
}) {
  const [review, setReview] = useState(0);
  return (
    <HcSessionView
      key={`${hcTargetKey(target)}:${review}`}
      target={target}
      onAllSessions={onAllSessions}
      reopen={() => setReview((value) => value + 1)}
    />
  );
}
export default HerdrSession;

function HcSessionView({
  target,
  onAllSessions,
  reopen,
}: {
  target: HcTarget;
  onAllSessions?: (onPop?: () => void) => void;
  reopen: () => void;
}) {
  const { push } = useNavigation();
  const [paused, setPaused] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [mode, setMode] = useState<Mode>("output");
  const [selected, setSelected] = useState<string>("screen");
  const [reviewed, setReviewed] = useState<HcScreen>();
  const [textReview, setTextReview] = useState<TextReview>();
  const [customKey, setCustomKey] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState<string>();
  const inspected = useRef<{ id: string; screen: string } | undefined>(undefined);
  const [, update] = useState(0);
  const feed = useHcScreen(target, !paused && !busy);
  const localRef = useRef<HcLocalState | undefined>(undefined);
  if (!localRef.current)
    localRef.current = new HcLocalState(hcTargetKey(target), LocalStorage, () => {
      if (feed.mounted.current) update((value) => value + 1);
    });
  const local = localRef.current;
  const [conversation, setConversation] = useState<HcConversation>();
  useEffect(() => {
    const program = feed.pin.current;
    if (!program) return;
    let canceled = false;
    const next = new HcConversation(hcTargetKey(target), program, LocalStorage, () => {
      if (!canceled && feed.mounted.current) update((value) => value + 1);
    });
    setConversation(next);
    void next.load().then(() => {
      if (!canceled && feed.mounted.current && next.turns.length)
        setSelected((current) => (current === "screen" ? `reply:${next.turns.at(-1)!.id}` : current));
    });
    return () => {
      canceled = true;
    };
  }, [hcTargetKey(target), feed.pin.current]);
  useEffect(() => {
    if (!conversation?.ready || !feed.screen || feed.invalid || feed.error || busy) return;
    conversation.observe({
      text: sanitizeTerminalText(feed.screen.capture.text),
      state: feed.screen.terminal.status?.state,
      turn: feed.screen.terminal.turn,
      complete: feed.screen.capture.complete,
      stable: feed.screen.stable,
    });
  }, [conversation, feed.screen, feed.invalid, feed.error, busy]);
  const address = `${target.coreId}/${target.terminalId}`;
  const name = feed.screen?.terminal.name || target.terminalId;
  const live = () =>
    Boolean(feed.mounted.current && feed.observing.current && feed.client.current && !feed.invalidRef.current);
  const toastError = (cause: unknown) =>
    showToast({
      style: Toast.Style.Failure,
      title: "Terminal Input Not Confirmed",
      message: cause instanceof Error ? cause.message : "Cannot complete this terminal operation.",
    });
  useEffect(() => {
    void local.load().catch((cause) => {
      if (feed.mounted.current)
        setStorageError(cause instanceof Error ? cause.message : "Cannot restore HC input storage.");
    });
  }, [local]);
  function showChild(child: React.ReactNode) {
    if (busy || !feed.mounted.current) return;
    setPaused(true);
    push(child, () => {
      if (feed.mounted.current) {
        setPaused(false);
        void feed.refresh(true).catch(() => {});
      }
    });
  }
  async function refreshReview() {
    if (hcOperationLocks.has(local.key)) return;
    try {
      const fresh = await feed.refresh(true);
      if (!feed.mounted.current) return;
      setReviewed(fresh);
      setNotice(undefined);
    } catch (cause) {
      await toastError(cause);
    }
  }
  async function openControls() {
    if (!feed.mounted.current || hcOperationLocks.has(local.key)) return;
    setMode("controls");
    setSelected("review-screen");
    setTextReview(undefined);
    setReviewed(undefined);
    await refreshReview();
  }
  async function preflight(expected?: HcScreen) {
    if (!live()) throw new Error(feed.invalidRef.current || "HC is not connected. Reconnect and start a new review.");
    const fresh = await feed.refresh(true);
    if (!live()) throw new Error(feed.invalidRef.current || "The terminal changed during preflight.");
    if (fresh.stable === false || (expected && hcScreenFingerprint(expected) !== hcScreenFingerprint(fresh))) {
      setReviewed(fresh);
      setSelected(mode === "text" ? "submit-text" : "review-screen");
      setNotice(
        "The screen or terminal state changed. Review this updated capture, then explicitly activate your action again. Nothing was sent.",
      );
      return false;
    }
    return true;
  }
  async function operate<T>(
    kind: Attempt["kind"],
    text: string | undefined,
    check: () => Promise<boolean>,
    request: (client: HcClient) => Promise<T>,
    active: () => boolean = live,
  ) {
    if (busy || !feed.mounted.current) return undefined;
    setBusy(true);
    let conversationId: string | undefined;
    try {
      const result = await local.run(
        kind,
        text,
        check,
        async () => {
          const client = feed.client.current;
          if (!client) throw new Error("HC disconnected before input submission.");
          if (kind === "task") {
            const baseline = feed.latest.current;
            if (!conversation?.ready || !baseline)
              throw new HcError("changed", "Message history is not ready. Nothing was sent.");
            conversationId = local.attempt!.id;
            try {
              await conversation.begin(conversationId, text!, {
                text: sanitizeTerminalText(baseline.capture.text),
                state: baseline.terminal.status?.state,
                turn: baseline.terminal.turn,
                complete: baseline.capture.complete,
                stable: baseline.stable,
              });
            } catch (cause) {
              throw new HcError(
                "changed",
                cause instanceof Error ? cause.message : "Cannot save message. Nothing was sent.",
              );
            }
            if (!live() || !active()) throw new HcError("changed", "The terminal review closed. Nothing was sent.");
          }
          const value = await request(client);
          if (conversationId) conversation!.submitted(conversationId);
          return value;
        },
        () => live() && active(),
      );
      if (result.sent && feed.mounted.current) {
        if (kind === "task") {
          setNotice(undefined);
          void showToast({ style: Toast.Style.Success, title: "Message Submitted" }).catch(() => {});
        } else {
          setNotice(
            kind === "key"
              ? "Key sent. This does not confirm approval or completion."
              : kind === "interrupt"
                ? "Interrupt submitted. See the actual outcome below."
                : "Input submitted. Agent receipt and completion are not confirmed.",
          );
        }
        setSelected(mode === "output" ? (conversationId ? `reply:${conversationId}` : "screen") : "review-screen");
        setReviewed(undefined);
        await feed.refresh(true).catch(() => {});
      }
      return result;
    } catch (cause) {
      if (conversationId) conversation?.failed(conversationId, !local.attempt);
      if (feed.mounted.current)
        setNotice(cause instanceof Error ? cause.message : "Operation failed; inspect the current screen.");
      await toastError(cause);
      return undefined;
    } finally {
      if (feed.mounted.current) setBusy(false);
    }
  }
  async function sendTask(text: string, program?: string, active: () => boolean = live, fromComposer = false) {
    if (!text.trim() || text.length > MAX_INPUT) {
      await toastError(new Error("Enter 1–100,000 characters."));
      return false;
    }
    if (!active() || !program || program !== feed.pin.current || !live()) {
      await toastError(new Error("This terminal changed while composing. Your draft is kept; start a new review."));
      return false;
    }
    let routed = false;
    let expectedState: string | undefined;
    const result = await operate(
      "task",
      text,
      async () => {
        if (!(await preflight())) return false;
        const current = feed.latest.current!.terminal;
        if (!hcReportedReady(current)) {
          if (current.reported === true && current.status?.state === "blocked") {
            routed = true;
            setMode("controls");
            setSelected("review-screen");
            setTextReview(undefined);
            setReviewed(feed.latest.current);
            setNotice("The Agent needs input. Review the current prompt here; your message draft is kept.");
          } else {
            setNotice(
              current.reported === true && current.status?.state === "working"
                ? "The Agent is still working. Your draft is kept; send when it is ready. Herdr does not provide Argo's message queue."
                : "This terminal is not reported ready. Your draft is kept; review terminal input before sending.",
            );
          }
          return false;
        }
        // HC only accepts idle/working conditions. Done needs a fresh check and force:false, without an unsupported condition.
        expectedState = current.status!.state === "idle" ? "idle" : undefined;
        return true;
      },
      (client) =>
        client.request("terminal.send", {
          terminal: address,
          text,
          force: false,
          ...(expectedState ? { if: expectedState } : {}),
          wait: false,
        }),
      active,
    );
    return result?.sent || (fromComposer && routed && active());
  }
  function compose(kind: InputKind) {
    if (!local.ready || storageError || busy) return;
    const program = feed.pin.current;
    showChild(
      <HcCompose
        text={local.drafts[kind]}
        change={(text) => local.change(kind, text)}
        title={
          kind === "answer"
            ? "Respond to Current Prompt"
            : kind === "terminal"
              ? "Compose Terminal Input"
              : "Compose Message"
        }
        submitTitle={kind === "task" ? "Send Message" : "Review Input"}
        description={
          kind === "task"
            ? "Your draft is saved on this Mac. Send when the Agent is ready, including after a completed answer. Working keeps your draft, not a queued send. Nothing forces past a dialog or retries automatically."
            : kind === "answer"
              ? "Reply to the currently displayed terminal dialog. Next you will review the full screen and answer before explicitly submitting with HC force:true. This is not a queued task."
              : "This program has no status reporter. Next review the full screen and text before submitting terminal input with force:false and no idle condition. It may be a shell command."
        }
        send={async (text, active) => {
          if (!text.trim() || text.length > MAX_INPUT) {
            await toastError(new Error("Enter 1–100,000 characters."));
            return false;
          }
          if (!active() || !feed.mounted.current || !live() || !program || program !== feed.pin.current) {
            await toastError(new Error("The terminal changed while composing. Your draft is kept."));
            return false;
          }
          if (kind === "task") return sendTask(text, program, active, true);
          try {
            const fresh = await feed.refresh(true);
            if (!active() || !live() || program !== feed.pin.current)
              throw new Error("This composer closed or the terminal changed. Start a new review.");
            if (kind === "terminal" && fresh.terminal.reported === true)
              throw new Error(
                "This program reports status. Use Send Task when Idle or Respond to Current Prompt instead.",
              );
            setReviewed(fresh);
            setTextReview({ kind, text });
            setMode("text");
            setSelected("submit-text");
            setNotice(undefined);
            return true;
          } catch (cause) {
            await toastError(cause);
            return false;
          }
        }}
      />,
    );
  }
  async function sendKey(raw: string) {
    const key = hcKeyToken(raw);
    if (key === "ctrl+c") {
      await interrupt();
      return;
    }
    if (!reviewed) {
      await refreshReview();
      setNotice("Review the current screen, then explicitly activate the key again. Nothing was sent.");
      return;
    }
    await operate(
      "key",
      key,
      () => preflight(reviewed),
      (client) => client.request("terminal.keys", { terminal: address, keys: [key] }),
    );
  }
  async function submitText() {
    if (!textReview || !reviewed) {
      await refreshReview();
      return;
    }
    const { kind, text } = textReview;
    const result = await operate(
      kind,
      text,
      async () => {
        if (!(await preflight(reviewed))) return false;
        if (kind === "terminal" && feed.latest.current!.terminal.reported === true)
          throw new Error("This program now reports status. Start a new input review.");
        return true;
      },
      (client) => client.request("terminal.send", { terminal: address, text, force: kind === "answer", wait: false }),
    );
    if (result?.sent && feed.mounted.current) {
      setTextReview(undefined);
      setMode("controls");
    }
  }
  async function interrupt() {
    if (
      busy ||
      !(await confirmAlert({
        title: "Interrupt This Terminal?",
        message: `${name}\nHC chooses the interrupt key and reports stopped, exited, still_working, or unknown. This never kills the process.`,
        primaryAction: { title: "Interrupt", style: Alert.ActionStyle.Destructive },
        dismissAction: { title: "Cancel" },
      }))
    )
      return;
    const result = await operate(
      "interrupt",
      undefined,
      () => preflight(),
      (client) => client.request<{ outcome: string; key?: string }>("terminal.interrupt", { terminal: address }),
    );
    if (result?.sent && feed.mounted.current)
      setNotice(
        `Interrupt outcome: ${sanitizeTerminalText(String(result.value?.outcome ?? "unknown"))}${result.value?.key ? ` · key: ${sanitizeTerminalText(result.value.key)}` : ""}. This is the HC result, not a completion guarantee.`,
      );
  }
  async function inspectUncertain() {
    if (hcOperationLocks.has(local.key)) return;
    try {
      const fresh = await feed.refresh(true);
      if (!feed.mounted.current || !local.attempt) return;
      setMode("output");
      setSelected("screen");
      setReviewed(fresh);
      inspected.current = { id: local.attempt.id, screen: hcScreenFingerprint(fresh) };
      setNotice(
        "Inspect this current screen before acknowledging the uncertain input. Unlocking sends and cancels nothing.",
      );
    } catch (cause) {
      await toastError(cause);
    }
  }
  async function acknowledge() {
    if (busy || !local.attempt || hcOperationLocks.has(local.key)) return;
    try {
      const fresh = await feed.refresh(true);
      if (!feed.mounted.current) return;
      if (
        inspected.current?.id !== local.attempt.id ||
        inspected.current.screen !== hcScreenFingerprint(fresh) ||
        selected !== "screen"
      ) {
        setMode("output");
        setSelected("screen");
        setReviewed(fresh);
        inspected.current = { id: local.attempt.id, screen: hcScreenFingerprint(fresh) };
        setNotice(
          "Inspect this updated screen, then acknowledge again. The earlier input may still be queued. Nothing was sent or unlocked.",
        );
        return;
      }
      if (
        !(await confirmAlert({
          title: "Acknowledge Uncertain Input?",
          message:
            "The earlier input may still be queued. Acknowledging only unlocks future operations; it sends nothing, cancels nothing, and never replays the earlier input.",
          primaryAction: { title: "I Inspected Output — Unlock" },
          dismissAction: { title: "Keep Locked" },
        }))
      )
        return;
      if (!feed.mounted.current) return;
      await local.acknowledge();
      inspected.current = undefined;
      setNotice("Uncertainty acknowledged. Nothing was sent, retried, or canceled.");
    } catch (cause) {
      await toastError(cause);
    }
  }
  async function history() {
    if (
      busy ||
      hcOperationLocks.has(local.key) ||
      !(await confirmAlert({
        title: "Read Terminal History?",
        message:
          "HC may scroll the original TUI to capture up to 200 lines. Current-screen refresh never scrolls. Continue?",
        primaryAction: { title: "Read History" },
      }))
    )
      return;
    if (!feed.mounted.current || hcOperationLocks.has(local.key)) return;
    hcOperationLocks.add(local.key);
    setBusy(true);
    setPaused(true);
    try {
      const client = feed.client.current;
      if (!client) throw new Error("HC is disconnected.");
      const capture = await client.read(target, 200);
      if (!feed.mounted.current) return;
      push(
        <Detail
          navigationTitle="Terminal History · Read Only"
          markdown={`# Terminal History\n\n${literal(sanitizeTerminalText(capture.text))}\n\n${literal(`${capture.complete ? "HC reports complete capture" : "Incomplete capture"}\nMethod: ${capture.how}\n${capture.why ?? ""}`)}`}
        />,
        () => {
          if (feed.mounted.current) {
            setPaused(false);
            void feed.refresh(true).catch(() => {});
          }
        },
      );
    } catch (cause) {
      if (feed.mounted.current) setPaused(false);
      await toastError(cause);
    } finally {
      hcOperationLocks.delete(local.key);
      if (feed.mounted.current) setBusy(false);
    }
  }
  const terminal = feed.screen?.terminal;
  const blocked = terminal?.reported === true && terminal.status?.state === "blocked";
  const unavailable = storageError || feed.invalid || feed.error;
  const canSend = Boolean(
    local.ready &&
    conversation?.ready &&
    !conversation.error &&
    !busy &&
    !unavailable &&
    !local.attempt &&
    terminal &&
    hcReportedReady(terminal),
  );
  const changed = reviewed && feed.screen && hcScreenFingerprint(reviewed) !== hcScreenFingerprint(feed.screen);
  const preview = mode === "output" ? feed.screen : reviewed || feed.screen;
  const markdown = hcScreenMarkdown(preview, mode === "output" ? undefined : "Current Terminal Dialog");
  const inputWarning =
    "Remote terminal input, not a native approval transaction. HC waits for 3 seconds of terminal quiet before input, which can delay delivery. The screen can change after preflight.";
  function sharedActions() {
    return (
      <>
        {mode === "output" && blocked ? (
          <Action title="Review Current Prompt" icon={Icon.Eye} onAction={openControls} />
        ) : mode === "output" && local.drafts.task.trim() && canSend ? (
          <Action
            title="Send Message"
            icon={Icon.ArrowUp}
            onAction={() => sendTask(local.drafts.task, feed.pin.current)}
          />
        ) : null}
        {mode === "output" && selected !== "screen" ? (
          <Action
            title="View Raw Terminal"
            icon={Icon.Terminal}
            onAction={() => {
              setFullWidth(false);
              setSelected("screen");
            }}
          />
        ) : null}
        {mode === "output" && !unavailable && !local.attempt ? (
          <Action
            title={fullWidth ? "Back to Split View" : "Read Full Width"}
            icon={fullWidth ? Icon.List : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => setFullWidth((value) => !value)}
          />
        ) : null}
        <Action
          title="Refresh Current Screen"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => {
            if (hcOperationLocks.has(local.key)) return;
            return mode === "output" ? feed.refresh(true).catch(toastError) : refreshReview();
          }}
        />
        {!busy ? (
          <>
            <Action.Push
              title="Terminal Identity"
              icon={Icon.Info}
              onPush={() => setPaused(true)}
              onPop={() => {
                if (feed.mounted.current) {
                  setPaused(false);
                  void feed.refresh(true).catch(() => {});
                }
              }}
              target={
                <Detail
                  navigationTitle="Terminal Identity · Read Only"
                  markdown={`# Terminal Identity\n\n${literal(
                    sanitizeTerminalText(
                      [
                        "Source: Herdr Core · Direct Socket",
                        `Name: ${name}`,
                        `Target: ${address}`,
                        `Host Core: ${target.hostCoreId}`,
                        `Socket: ${target.socketPath}`,
                        `Observed Address: ${terminal?.address || "Unavailable"}`,
                        `Directory: ${terminal?.cwd || "Unknown"}`,
                        `Program: ${terminal?.foreground?.name || terminal?.argv.join(" ") || "Unknown"}`,
                        `State: ${hcStatus(terminal)}`,
                        `Connection: ${feed.error || feed.invalid ? "Stale / Review Required" : feed.loading ? "Connecting" : "Connected"}`,
                        `Terminal size: ${terminal?.cols ?? "?"} columns × ${terminal?.rows ?? "?"} rows`,
                        `Capture: ${preview ? `${new Date(preview.capturedAt).toLocaleTimeString()} · ${preview.capture.complete ? "Complete" : "Incomplete"} · ${preview.capture.how}` : "Unavailable"}`,
                        ...(preview?.capture.why ? [`Capture note: ${preview.capture.why}`] : []),
                        "Plain terminal capture preserves existing line breaks and spacing. Color-only highlighting may be missing; no selected option is inferred.",
                      ].join("\n"),
                    ),
                  )}`}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Terminal Target" content={address} />
                    </ActionPanel>
                  }
                />
              }
            />
            <Action.CopyToClipboard title="Copy Terminal Target" content={address} />
            <Action
              title="Compose Message"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => compose(terminal && terminal.reported !== true ? "terminal" : "task")}
            />
            {mode !== "controls" ? (
              <Action title="Review Terminal Controls" icon={Icon.Terminal} onAction={openControls} />
            ) : null}
            <Action title="Respond to Current Prompt" icon={Icon.Message} onAction={() => compose("answer")} />
            {terminal && terminal.reported !== true ? (
              <Action
                title="Review Unreported Terminal Input"
                icon={Icon.Pencil}
                onAction={() => compose("terminal")}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Terminal Output"
              content={sanitizeTerminalText(preview?.capture.text || "")}
            />
            <Action
              title="Open Herdr"
              icon={Icon.AppWindow}
              onAction={async () => {
                try {
                  await openHerdr();
                } catch (cause) {
                  await toastError(cause);
                }
              }}
            />
            <Action title="Read More History…" icon={Icon.Clock} onAction={history} />
            {local.attempt ? (
              <Action title="Acknowledge Uncertain Input…" icon={Icon.ExclamationMark} onAction={acknowledge} />
            ) : null}
            <Action
              title="Interrupt Terminal…"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={interrupt}
            />
            <Action
              title="Reconnect and Start New Review…"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                if (hcOperationLocks.has(local.key)) return;
                if (
                  (await confirmAlert({
                    title: "Start a New Terminal Review?",
                    message:
                      "Reconnect to this exact target and pin the current program. Old screen reviews are discarded; drafts and uncertain attempts stay isolated and are never sent automatically.",
                    primaryAction: { title: "Reconnect and Review" },
                  })) &&
                  feed.mounted.current
                )
                  reopen();
              }}
            />
            {onAllSessions ? (
              <Action
                title="All Sessions"
                icon={Icon.List}
                onAction={() => {
                  if (!feed.mounted.current) return;
                  setPaused(true);
                  onAllSessions(() => {
                    if (feed.mounted.current) {
                      setPaused(false);
                      void feed.refresh(true).catch(() => {});
                    }
                  });
                }}
              />
            ) : null}
          </>
        ) : null}
      </>
    );
  }
  const outputMarkdown = `${notice ? `## Recent Operation\n\n${literal(sanitizeTerminalText(notice))}\n\n` : ""}${changed && mode !== "output" ? "**Live screen changed. Refresh or activate an action to review the updated capture before input.**\n\n" : ""}${markdown}${mode !== "output" ? `\n\n${inputWarning}` : ""}`;
  const details = (
    <List.Item.Detail
      markdown={outputMarkdown}
      metadata={
        mode !== "output" ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="State" text={hcStatus(terminal)} />
            <List.Item.Detail.Metadata.Label
              title="Connection"
              text={feed.error || feed.invalid ? "Stale / Review Required" : feed.loading ? "Connecting" : "Connected"}
            />
            <List.Item.Detail.Metadata.Label
              title="Machine"
              text={
                target.coreId === target.hostCoreId
                  ? feed.client.current?.core.name || "Local Host"
                  : terminal?.address.split("/")[0] || target.coreId
              }
            />
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
  const selectedTurn = conversation?.turns.find(
    (turn) => selected === `user:${turn.id}` || selected === `reply:${turn.id}`,
  );
  if (fullWidth && mode === "output" && !unavailable && !local.attempt) {
    return (
      <Detail
        navigationTitle={`${name} · ${hcStatus(terminal)} · Full Width`}
        isLoading={feed.loading || busy}
        markdown={
          selectedTurn
            ? `${notice ? `${literal(sanitizeTerminalText(notice))}\n\n` : ""}${hcMessageMarkdown(selectedTurn, selected.startsWith("user:"))}`
            : outputMarkdown
        }
        actions={<ActionPanel>{sharedActions()}</ActionPanel>}
      />
    );
  }
  return (
    <List
      navigationTitle={`${name} · ${mode === "output" ? "Herdr Terminal" : mode === "text" ? "Review Prompt Response" : "Terminal Controls"}`}
      isShowingDetail
      filtering={false}
      isLoading={feed.loading || busy}
      selectedItemId={selected}
      onSelectionChange={(id) => {
        if (id) setSelected(id);
      }}
      searchText={mode === "output" ? local.drafts.task : ""}
      onSearchTextChange={(text) => {
        if (mode === "output") local.change("task", text);
      }}
      searchBarPlaceholder={
        mode === "output"
          ? blocked
            ? "Task draft kept · Enter reviews current prompt · ⌘N compose"
            : terminal?.status?.state === "working"
              ? "Agent working · Draft kept · ⌘N multiline"
              : "Draft a message · Enter to send · ⌘N for multiline…"
          : "Select one explicit action · No automatic Enter or key sequences"
      }
      actions={<ActionPanel>{sharedActions()}</ActionPanel>}
    >
      {unavailable ? (
        <List.Item
          id="connection"
          title="Review Required"
          subtitle="Input is disabled; drafts are kept"
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`# Cannot Verify This Terminal\n\n${literal(sanitizeTerminalText(unavailable))}\n\nReconnect and start a new review of this exact target. Saved input never replays.`}
            />
          }
          actions={<ActionPanel>{sharedActions()}</ActionPanel>}
        />
      ) : null}
      {local.attempt ? (
        <List.Item
          id="uncertain"
          title={busy ? "Submitting Terminal Input" : "Input Result Uncertain"}
          subtitle={busy ? "Waiting for HC response · No automatic retry" : "Inspect output before unlocking"}
          icon={{ source: busy ? Icon.Clock : Icon.Warning, tintColor: busy ? Color.SecondaryText : Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`# ${busy ? "Submitting Terminal Input" : "Input May Have Reached the Terminal"}\n\n${literal(`${local.attempt.kind}\n${local.attempt.at ? new Date(local.attempt.at).toLocaleString() : "Unknown time"}\n${sanitizeTerminalText(local.attempt.text || "Interrupt attempt")}`)}\n\n${busy ? "Waiting for HC response. No automatic retry. Other terminal operations stay locked while this request is running." : "Never retried automatically. All mutations stay locked, including after reopening Raycast. Inspect the current screen, then acknowledge. Acknowledging sends and cancels nothing."}`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Inspect Latest Output" icon={Icon.Eye} onAction={inspectUncertain} />
              {sharedActions()}
            </ActionPanel>
          }
        />
      ) : null}
      {mode === "output" && conversation?.error ? (
        <List.Item
          id="conversation-error"
          title="Message History Unavailable"
          icon={Icon.Warning}
          detail={<List.Item.Detail markdown={safeMarkdown(conversation.error)} />}
          actions={<ActionPanel>{sharedActions()}</ActionPanel>}
        />
      ) : null}
      {mode === "output" && conversation?.turns.length ? (
        <List.Section title="Conversation">
          {[...conversation.turns].reverse().flatMap((turn) =>
            [false, true].map((user) => (
              <List.Item
                key={`${user ? "user" : "reply"}:${turn.id}`}
                id={`${user ? "user" : "reply"}:${turn.id}`}
                title={(user
                  ? turn.text
                  : turn.output || (turn.state === "done" ? "View terminal output" : "Waiting for output…")
                )
                  .replace(/\s+/g, " ")
                  .slice(0, 100)}
                accessories={[
                  {
                    text: user
                      ? turn.state === "submitting"
                        ? "Sending"
                        : turn.state === "rejected"
                          ? "Not sent"
                          : turn.state === "unknown"
                            ? "Uncertain"
                            : "You"
                      : !turn.isolated
                        ? "Raw screen"
                        : turn.state === "done"
                          ? "Output"
                          : turn.state === "working"
                            ? "Working"
                            : turn.state === "blocked"
                              ? "Needs input"
                              : turn.state === "paused"
                                ? "Paused"
                                : turn.state === "rejected"
                                  ? "Not sent"
                                  : turn.state === "unknown"
                                    ? "Uncertain"
                                    : "Waiting",
                  },
                ]}
                icon={user ? Icon.Person : Icon.Message}
                detail={
                  <List.Item.Detail
                    markdown={`${notice ? `${literal(sanitizeTerminalText(notice))}\n\n` : ""}${hcMessageMarkdown(turn, user)}`}
                  />
                }
                actions={
                  <ActionPanel>
                    {sharedActions()}
                    <Action.CopyToClipboard title="Copy Message" content={user ? turn.text : turn.output} />
                  </ActionPanel>
                }
              />
            )),
          )}
        </List.Section>
      ) : null}
      <List.Section title={mode === "output" ? "Terminal" : "Review Current Dialog"} subtitle={hcStatus(terminal)}>
        <List.Item
          id={mode === "output" ? "screen" : "review-screen"}
          title={mode === "output" ? "Terminal Output" : "Current Screen"}
          subtitle={
            busy
              ? "Submitting · output remains readable"
              : blocked
                ? "Needs input · resolve in Raycast"
                : terminal && hcReportedReady(terminal)
                  ? "Ready for your next message"
                  : terminal?.status?.state === "working"
                    ? "Agent working · your next draft stays local"
                    : "Current screen · no terminal scrolling"
          }
          icon={Icon.Terminal}
          detail={details}
          actions={<ActionPanel>{sharedActions()}</ActionPanel>}
        />
      </List.Section>
      {mode === "controls" ? (
        <List.Section title="Single-Step Keys" subtitle="Literal keys · meaning comes only from the screen">
          {keyRows.map(([key, title]) => (
            <List.Item
              key={key}
              id={`key:${key}`}
              title={title}
              icon={Icon.Keyboard}
              detail={details}
              actions={
                <ActionPanel>
                  {!busy && !unavailable && !local.attempt ? (
                    <Action title={title} icon={Icon.Keyboard} onAction={() => sendKey(key)} />
                  ) : null}
                  {sharedActions()}
                </ActionPanel>
              }
            />
          ))}
          {customKey ? (
            <List.Item
              id="custom-key"
              title={`Send ${customKey}`}
              icon={Icon.Keyboard}
              detail={details}
              actions={
                <ActionPanel>
                  {!busy && !unavailable && !local.attempt ? (
                    <Action title={`Send ${customKey}`} onAction={() => sendKey(customKey)} />
                  ) : null}
                  {sharedActions()}
                </ActionPanel>
              }
            />
          ) : null}
          <List.Item
            id="choose-key"
            title="Custom Key…"
            subtitle="Review before sending"
            icon={Icon.Keyboard}
            detail={details}
            actions={
              <ActionPanel>
                <Action
                  title="Choose One Key"
                  onAction={() =>
                    showChild(
                      <CustomKey
                        choose={(key) => {
                          if (feed.mounted.current) {
                            setCustomKey(key);
                            setSelected("custom-key");
                          }
                        }}
                      />,
                    )
                  }
                />
                {sharedActions()}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {mode === "text" && textReview ? (
        <List.Section title={textReview.kind === "answer" ? "Respond to Current Prompt" : "Unreported Terminal Input"}>
          <List.Item
            id="submit-text"
            title={textReview.kind === "answer" ? "Submit Prompt Response" : "Submit Terminal Input"}
            subtitle={
              textReview.kind === "answer"
                ? "Explicit dialog response · force:true · text is submitted"
                : "No status reporter · force:false · text is submitted"
            }
            icon={Icon.ArrowUp}
            detail={
              <List.Item.Detail
                markdown={`# Review Your ${textReview.kind === "answer" ? "Response" : "Terminal Input"}\n\n${literal(sanitizeTerminalText(textReview.text))}\n\n${textReview.kind === "answer" ? "This explicitly replies to the current dialog using HC force:true, not the ordinary task queue." : "This program does not report Idle. Input uses force:false with no idle condition and may execute a shell command."}\n\n${changed ? "**The live screen changed. First activation updates this preview without sending.**\n\n" : ""}${notice ? `${literal(sanitizeTerminalText(notice))}\n\n` : ""}${markdown}\n\n${inputWarning}`}
              />
            }
            actions={
              <ActionPanel>
                {!busy && !unavailable && !local.attempt ? (
                  <Action
                    title={
                      textReview.kind === "answer" ? "Submit Response to This Dialog" : "Submit Reviewed Terminal Input"
                    }
                    icon={Icon.ArrowUp}
                    onAction={submitText}
                  />
                ) : null}
                {sharedActions()}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {mode !== "output" ? (
        <List.Section title="Continue">
          <List.Item
            id="respond"
            title="Respond to Current Prompt…"
            subtitle="Compose text, then review the actual dialog"
            icon={Icon.Message}
            detail={details}
            actions={
              <ActionPanel>
                <Action title="Compose Prompt Response" onAction={() => compose("answer")} />
                {sharedActions()}
              </ActionPanel>
            }
          />
          {terminal && terminal.reported !== true ? (
            <List.Item
              id="terminal-input"
              title="Review Unreported Terminal Input…"
              subtitle="Explicit input · no assumed Idle status"
              icon={Icon.Pencil}
              detail={details}
              actions={
                <ActionPanel>
                  <Action title="Compose Terminal Input" onAction={() => compose("terminal")} />
                  {sharedActions()}
                </ActionPanel>
              }
            />
          ) : null}
          <List.Item
            id="back-output"
            title="Back to Terminal Output"
            icon={Icon.ArrowLeft}
            detail={details}
            actions={
              <ActionPanel>
                <Action
                  title="Back to Output"
                  onAction={() => {
                    setMode("output");
                    setSelected("screen");
                    setTextReview(undefined);
                  }}
                />
                {sharedActions()}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
