import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { ChatMessage, Endpoint, endpoints, formatTimings, health, prefs, runConversation, Timings } from "./calypso";
import {
  Conversation,
  ConversationMeta,
  Turn,
  clearAllConversations,
  conversationToMarkdown,
  deleteConversation,
  loadConversation,
  newConversationId,
  readIndex,
  saveConversation,
} from "./history";

/**
 * Multi-turn chat with CALYPSO, with persistent history.
 *
 * The Ask commands each build a fresh message list per invocation, so every
 * question started from nothing. Here the transcript lives in state and is
 * handed back whole on each turn, so follow-ups resolve against what was
 * already said AND against whatever web_search / rag_search returned earlier.
 */

interface TurnWithTimings extends Turn {
  timings?: Timings;
}

export default function Command() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<TurnWithTimings[]>([]);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const convId = useRef<string>(newConversationId());
  // The transcript sent to the model — includes tool messages the UI never shows.
  const history = useRef<ChatMessage[]>([]);
  const aborter = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  // Reopen the most recent conversation so closing Raycast doesn't lose the thread.
  useEffect(() => {
    (async () => {
      const index = await readIndex();
      if (index.length > 0) {
        const latest = await loadConversation(index[0].id);
        if (latest) {
          convId.current = latest.id;
          setTurns(latest.turns);
          history.current = latest.history;
        }
      }
      setRestored(true);
    })();
  }, []);

  // Persist once a turn settles, never mid-stream.
  useEffect(() => {
    if (!restored || busy || turns.length === 0) return;
    saveConversation(convId.current, turns, history.current).catch(() => undefined);
  }, [turns, busy, restored]);

  function adopt(c: Conversation) {
    aborter.current?.abort();
    convId.current = c.id;
    setTurns(c.turns);
    history.current = c.history;
    setInput("");
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    setInput("");
    setBusy(true);
    setTurns((t) => [...t, { question: q, answer: "", reasoning: "", tools: [], streaming: true }]);

    const p = prefs();
    const ctrl = new AbortController();
    aborter.current = ctrl;

    const update = (patch: Partial<TurnWithTimings>) =>
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, ...patch } : turn)));

    try {
      // Seed the system prompt once, on the first turn only.
      if (history.current.length === 0 && p.systemPrompt?.trim()) {
        history.current.push({ role: "system", content: p.systemPrompt.trim() });
      }
      history.current.push({ role: "user", content: q });

      let chosen: Endpoint | null = null;
      for (const ep of endpoints(p, p.preferredEndpoint || "auto")) {
        if (await health(ep, p)) {
          chosen = ep;
          break;
        }
      }
      if (!chosen) {
        throw new Error(
          "No endpoint responded. Check Tailscale, that a rig is awake, or set a Cloud Fallback Provider in preferences.",
        );
      }
      update({ endpoint: chosen.label ?? chosen.model });

      let answer = "";
      let reasoning = "";
      const toolLines: string[] = [];

      for await (const ev of runConversation(chosen, p, history.current, ctrl.signal)) {
        if (ev.content) {
          answer += ev.content;
          update({ answer });
        }
        if (ev.reasoning) {
          reasoning += ev.reasoning;
          update({ reasoning });
        }
        if (ev.toolCall) {
          toolLines.push(`→ ${ev.toolCall}`);
          update({ tools: [...toolLines] });
        }
        if (ev.toolResult) {
          toolLines.push(`   ${ev.toolResult}`);
          update({ tools: [...toolLines] });
        }
        if (ev.timings) update({ timings: ev.timings });
        if (ev.done) break;
      }

      // Only the assistant's prose goes back into history; tool traffic was
      // already folded in by runConversation's own loop.
      history.current.push({ role: "assistant", content: answer });
      update({ streaming: false });
    } catch (e) {
      const msg = (e as Error).message;
      if ((e as Error).name === "AbortError") {
        update({ streaming: false, error: "stopped" });
      } else {
        update({ streaming: false, error: msg });
        await showFailureToast(e, { title: "Request failed" });
      }
      // Drop the user turn that never got an answer, so a retry isn't duplicated.
      const lastUser = history.current.map((m) => m.role).lastIndexOf("user");
      if (lastUser >= 0) history.current.splice(lastUser);
    } finally {
      setBusy(false);
      aborter.current = null;
    }
  }

  async function startNew() {
    aborter.current?.abort();
    // The current chat is already saved; just move to a fresh id.
    convId.current = newConversationId();
    history.current = [];
    setTurns([]);
    setInput("");
    await showToast({ style: Toast.Style.Success, title: "New conversation" });
  }

  const actions = (turn?: TurnWithTimings) => (
    <ActionPanel>
      <Action title="Send" icon={Icon.ArrowRight} onAction={() => send(input)} />
      {turn?.answer ? <Action.CopyToClipboard title="Copy Answer" content={turn.answer} /> : null}
      {busy ? (
        <Action
          title="Stop"
          icon={Icon.Stop}
          // eslint-disable-next-line @raycast/prefer-common-shortcut -- Stop is not Pin; the keystrokes merely collide.
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "." },
            Windows: { modifiers: ["ctrl"], key: "." },
          }}
          onAction={() => aborter.current?.abort()}
        />
      ) : null}
      <Action
        title="New Conversation"
        icon={Icon.Plus}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "n" },
          Windows: { modifiers: ["ctrl", "shift"], key: "n" },
        }}
        onAction={startNew}
      />
      <Action
        title="Chat History"
        icon={Icon.Clock}
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        onAction={() => push(<HistoryView onOpen={adopt} currentId={convId.current} />)}
      />
    </ActionPanel>
  );

  const detail = (t: TurnWithTimings) => {
    const parts = [`**You**\n\n${t.question}\n\n---\n`];
    if (t.tools.length) parts.push("```\n" + t.tools.join("\n") + "\n```\n");
    if (t.reasoning) parts.push(`> ${t.reasoning.replace(/\n/g, "\n> ")}\n`);
    parts.push(t.answer || (t.streaming ? "_thinking…_" : ""));
    if (t.error) parts.push(`\n\n⚠️ ${t.error}`);
    return parts.join("\n");
  };

  return (
    <List
      isShowingDetail={turns.length > 0}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder={busy ? "CALYPSO is working…" : "Ask CALYPSO — ↵ to send"}
      isLoading={busy || !restored}
      actions={actions()}
    >
      {turns.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="Ask CALYPSO anything"
          description="Follow-ups keep the thread. ⌘Y for past chats, ⌘⇧N to start fresh."
        />
      ) : (
        [...turns].reverse().map((t, ri) => {
          const i = turns.length - 1 - ri;
          return (
            <List.Item
              key={i}
              icon={
                t.error
                  ? { source: Icon.Warning, tintColor: Color.Red }
                  : t.streaming
                    ? { source: Icon.Clock, tintColor: Color.Yellow }
                    : { source: Icon.CheckCircle, tintColor: Color.Green }
              }
              title={t.question}
              accessories={[
                t.tools.length ? { text: `${t.tools.filter((l) => l.startsWith("→")).length} tools` } : {},
                t.timings ? { text: formatTimings(t.timings) } : {},
                t.endpoint ? { tag: t.endpoint } : {},
              ].filter((a) => Object.keys(a).length > 0)}
              detail={<List.Item.Detail markdown={detail(t)} />}
              actions={actions(t)}
            />
          );
        })
      )}
    </List>
  );
}

/** Browse, reopen, export or delete past conversations. */
function HistoryView({ onOpen, currentId }: { onOpen: (c: Conversation) => void; currentId: string }) {
  const [index, setIndex] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const { pop } = useNavigation();

  const refresh = async () => {
    setIndex(await readIndex());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  async function open(id: string) {
    const c = await loadConversation(id);
    if (!c) {
      await showFailureToast(new Error("It may have been deleted."), { title: "Conversation not found" });
      await refresh();
      return;
    }
    onOpen(c);
    pop();
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search past chats…">
      {index.length === 0 ? (
        <List.EmptyView icon={Icon.Clock} title="No past chats yet" />
      ) : (
        index.map((m) => (
          <List.Item
            key={m.id}
            icon={m.id === currentId ? { source: Icon.Dot, tintColor: Color.Green } : Icon.Message}
            title={m.title}
            subtitle={`${m.turnCount} turn${m.turnCount === 1 ? "" : "s"}`}
            accessories={[{ date: new Date(m.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action title="Open" icon={Icon.ArrowRight} onAction={() => open(m.id)} />
                <Action
                  title="Copy as Markdown"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    const c = await loadConversation(m.id);
                    if (!c) return;
                    const { Clipboard } = await import("@raycast/api");
                    await Clipboard.copy(conversationToMarkdown(c));
                    await showToast({ style: Toast.Style.Success, title: "Copied" });
                  }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    await deleteConversation(m.id);
                    await refresh();
                  }}
                />
                <Action
                  title="Delete All"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={async () => {
                    await clearAllConversations();
                    await refresh();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
