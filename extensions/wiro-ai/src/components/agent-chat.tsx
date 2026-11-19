import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { agentReply, isMessageFinished, messageFailed, replyMedia, type AgentSummary } from "../lib/agent";
import { credentials } from "../lib/preferences";
import { getAgentMessage, sendAgentMessage, WiroError } from "../lib/wiro";

const MAX_WAIT_MS = 15 * 60_000;
const MAX_POLL_FAILURES = 5;
const KEPT_EXCHANGES = 50;

interface Exchange {
  id: string;
  question: string;
  reply: string;
  done: boolean;
  /** Set once the agent accepted the message, so a reply can be followed after the view reopens. */
  messageId?: string;
  error?: string;
  credits?: number;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function isPermanent(error: unknown): boolean {
  return (
    error instanceof WiroError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

/** The credits a reply used, or undefined while Wiro has not recorded them. */
function creditsOf(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const credits = Number(value);
  return Number.isFinite(credits) ? credits : undefined;
}

function replyMarkdown(exchange: Exchange): string {
  const images = replyMedia(exchange.reply).filter((url) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
  return [
    `**${exchange.question.replace(/\n+/g, " ")}**`,
    exchange.reply || (exchange.done ? "" : "_Working on it…_"),
    ...images.map((url) => `![](${url})`),
    exchange.error ? `**Error:** ${exchange.error}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** A conversation with one deployed agent. Its credits pay for the replies. */
export function AgentChat({ agent }: { agent: AgentSummary }) {
  const [exchanges, setExchanges] = useCachedState<Exchange[]>(`agent-chat-${agent.guid}`, []);
  // Raycast keeps its own session with each agent, apart from the dashboard's; New Conversation starts another.
  const [session, setSession] = useCachedState<string>(`agent-session-${agent.guid}`, "");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const controllerRef = useRef(new AbortController());
  const followingRef = useRef(new Set<string>());
  const sendingRef = useRef(false);
  const busy = exchanges.some((exchange) => !exchange.done);

  function update(id: string, change: Partial<Exchange>) {
    setExchanges((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }

  async function follow(id: string, messageId: string) {
    if (followingRef.current.has(id)) return;
    followingRef.current.add(id);
    const signal = controllerRef.current.signal;
    const startedAt = Date.now();
    let failures = 0;
    try {
      while (!signal.aborted && Date.now() - startedAt < MAX_WAIT_MS) {
        try {
          const row = await getAgentMessage(agent.guid, messageId, credentials(), signal);
          failures = 0;
          const reply = agentReply(row);
          if (isMessageFinished(row.status)) {
            update(id, {
              reply,
              done: true,
              credits: creditsOf(row.tokencost),
              error: messageFailed(row.status) ? "The agent could not finish this reply." : undefined,
            });
            return;
          }
          if (reply) update(id, { reply });
        } catch (error) {
          if (signal.aborted) return;
          failures += 1;
          if (isPermanent(error) || failures >= MAX_POLL_FAILURES) {
            update(id, { done: true, error: error instanceof Error ? error.message : String(error) });
            await showFailureToast(error, { title: "Could not read the reply" });
            return;
          }
        }
        await sleep(Date.now() - startedAt < 30_000 ? 2_000 : 5_000, signal);
      }
      if (!signal.aborted) {
        update(id, { done: true, error: "The agent is still working. Its reply shows up on wiro.ai." });
      }
    } finally {
      followingRef.current.delete(id);
    }
  }

  // Replies that were still on their way when the view closed are followed again.
  useEffect(() => {
    for (const exchange of exchanges) {
      if (exchange.done) continue;
      if (exchange.messageId) follow(exchange.id, exchange.messageId);
      else update(exchange.id, { done: true, error: "The message was not sent." });
    }
    return () => controllerRef.current.abort();
  }, []);

  async function send(rawText: string) {
    const text = rawText.trim();
    if (!text) return;
    if (sendingRef.current || busy) {
      await showToast({ style: Toast.Style.Failure, title: "Wait for the reply first" });
      return;
    }
    sendingRef.current = true;
    let sessionKey = session;
    if (!sessionKey) {
      sessionKey = `raycast-${randomUUID()}`;
      setSession(sessionKey);
    }
    const exchange: Exchange = { id: randomUUID(), question: text, reply: "", done: false };
    setExchanges((current) => [exchange, ...current].slice(0, KEPT_EXCHANGES));
    setSelectedId(exchange.id);
    setSearchText("");
    let messageId: string | undefined;
    try {
      messageId = await sendAgentMessage(agent.guid, text, sessionKey, credentials(), controllerRef.current.signal);
      update(exchange.id, { messageId });
    } catch (error) {
      if (controllerRef.current.signal.aborted) return;
      update(exchange.id, { done: true, error: error instanceof Error ? error.message : String(error) });
      await showFailureToast(error, { title: "Could not message the agent" });
      return;
    } finally {
      sendingRef.current = false;
    }
    await follow(exchange.id, messageId);
  }

  async function newConversation() {
    if (exchanges.length > 0) {
      const confirmed = await confirmAlert({
        title: "Start a new conversation?",
        message: "The messages of this conversation are removed from Raycast.",
        primaryAction: { title: "Start New Conversation", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    setExchanges([]);
    setSession(`raycast-${randomUUID()}`);
  }

  const sendAction = searchText.trim() ? (
    <Action title="Send Message" icon={Icon.Message} onAction={() => send(searchText)} />
  ) : undefined;
  const commonActions = (
    <>
      <Action
        title="New Conversation"
        icon={Icon.PlusCircle}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={newConversation}
      />
      <Action.OpenInBrowser title="Open Agent on Wiro AI" icon={Icon.Globe} url={agent.url} />
    </>
  );
  const rootActions = (
    <ActionPanel>
      {sendAction}
      {commonActions}
    </ActionPanel>
  );

  return (
    <List
      isLoading={busy}
      isShowingDetail={exchanges.length > 0}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={busy ? "Waiting for the reply…" : `Message ${agent.title}`}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      navigationTitle={agent.title}
      actions={rootActions}
    >
      {exchanges.length === 0 ? (
        <List.EmptyView
          icon={Icon.Person}
          title={`Message ${agent.title}`}
          description="Type a message and press Enter. Replies use the agent's credits."
          actions={rootActions}
        />
      ) : (
        exchanges.map((exchange) => (
          <List.Item
            key={exchange.id}
            id={exchange.id}
            icon={exchange.error ? Icon.ExclamationMark : exchange.done ? Icon.Message : Icon.CircleProgress}
            title={exchange.question}
            detail={
              <List.Item.Detail
                markdown={replyMarkdown(exchange)}
                metadata={
                  exchange.credits !== undefined ? (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Credits Used" text={String(exchange.credits)} />
                    </List.Item.Detail.Metadata>
                  ) : undefined
                }
              />
            }
            actions={
              <ActionPanel>
                {sendAction}
                {exchange.reply && <Action.CopyToClipboard title="Copy Reply" content={exchange.reply} />}
                {exchange.reply && (
                  <Action.Paste
                    title="Paste Reply"
                    content={exchange.reply}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Message"
                  content={exchange.question}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                {commonActions}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
