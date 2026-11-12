import { Action, ActionPanel, Color, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { exportThread, sendMessage, textOf, threadURL, type ExportedThread } from "../lib/amp";
import { markSeen } from "../lib/inbox";
import { useLiveThreads } from "../lib/live";
import { openInAmp, RecoveryActions, withToast } from "../lib/ui";
import { ThreadSecondaryActions } from "./thread-actions";

type Turn = { key: string; role: "user" | "assistant"; text: string; tools: string[] };

/** One turn per user message and per agent reply; tool results and empty steps fold into the reply. */
export function threadTurns(thread: ExportedThread): Turn[] {
  const turns: Turn[] = [];
  thread.messages.forEach((m, i) => {
    if (m.role === "info") return;
    const text = textOf(m).trim();
    if (m.role === "user") {
      if (text) turns.push({ key: String(i), role: "user", text, tools: [] });
      return;
    }
    const tools = m.content.filter((c) => c.type === "tool_use").map((c) => c.name ?? "tool");
    const last = turns[turns.length - 1];
    if (last?.role === "assistant") {
      if (text) last.text = last.text ? `${last.text}\n\n${text}` : text;
      last.tools.push(...tools);
    } else turns.push({ key: String(i), role: "assistant", text, tools });
  });
  return turns;
}

function toolSummary(tools: string[]): string {
  const counts = new Map<string, number>();
  for (const t of tools) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(" · ");
}

/** A thread read like its page on ampcode.com. The search bar is the composer: type and press Enter to send. */
export function ThreadView({ id, title, onChange }: { id: string; title: string; onChange?: () => void }) {
  const { pop } = useNavigation();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string>();
  const { data, isLoading, error, revalidate } = usePromise(exportThread, [id], {
    failureToastOptions: { title: "Couldn't load the thread" },
  });
  const live = useLiveThreads().find((t) => t.id === id);

  // Reload the transcript when the agent finishes its turn.
  const wasWorking = useRef(false);
  useEffect(() => {
    if (wasWorking.current && !live?.working) revalidate();
    wasWorking.current = !!live?.working;
  }, [live?.working]);

  // Opening the thread here counts as seeing it, once its transcript loaded.
  useEffect(() => {
    if (data) markSeen([id]).then(onChange);
  }, [data]);

  async function send(message: string) {
    if (!message.trim() || pending) return;
    setInput("");
    setPending(message);
    const sent = await withToast(
      "Sending…",
      async () => {
        await sendMessage(id, message);
        return true;
      },
      "Message sent",
    );
    setPending(undefined);
    if (sent) revalidate();
    else setInput(message);
  }

  const turns = data ? threadTurns(data).reverse() : [];
  const name = data?.title ?? title;
  const status = live?.working ? "Working" : live ? "Idle" : "Not running";
  const metadata = (
    <List.Item.Detail.Metadata>
      {live?.project ? (
        <List.Item.Detail.Metadata.Label title="Project" text={live.project} icon={Icon.Folder} />
      ) : null}
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item
          text={status}
          color={live?.working ? Color.Green : Color.SecondaryText}
        />
      </List.Item.Detail.Metadata.TagList>
      {data?.agentMode ? <List.Item.Detail.Metadata.Label title="Mode" text={data.agentMode} /> : null}
    </List.Item.Detail.Metadata>
  );
  const actions = (copy?: string) => (
    <ActionPanel>
      {input.trim() ? (
        <Action title="Send Message" icon={Icon.ArrowUp} onAction={() => send(input)} />
      ) : (
        <Action title="Open in Amp" icon={Icon.Globe} onAction={() => openInAmp(threadURL(id))} />
      )}
      {copy ? <Action.CopyToClipboard title="Copy Message" content={copy} /> : null}
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => revalidate()}
      />
      <ThreadSecondaryActions id={id} title={name} onChange={onChange} onArchived={pop} />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={!error}
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder={pending ? "Sending…" : "Message the agent, then press Enter"}
      isLoading={isLoading || !!pending}
      navigationTitle={name}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load the thread"
          description={error.message}
          actions={<RecoveryActions onRetry={revalidate} />}
        />
      ) : null}
      {pending ? (
        <List.Item
          id="pending"
          title={pending}
          icon={{ source: Icon.CircleProgress50, tintColor: Color.Green }}
          detail={<List.Item.Detail markdown={`**You**\n\n${pending}\n\n_Sending…_`} metadata={metadata} />}
          actions={actions(pending)}
        />
      ) : null}
      {turns.map((t, i) => {
        // The newest turn carries the working state, like the spinner under the last message on the web.
        const working = i === 0 && !!live?.working;
        return (
          <List.Item
            key={t.key}
            id={t.key}
            title={t.text.split("\n").find((l) => l.trim()) ?? toolSummary(t.tools)}
            icon={
              working
                ? { source: Icon.CircleProgress50, tintColor: Color.Green }
                : t.role === "user"
                  ? Icon.Person
                  : { source: "amp-menubar.png", tintColor: Color.SecondaryText }
            }
            detail={
              <List.Item.Detail
                markdown={[
                  `**${t.role === "user" ? "You" : "Amp"}**`,
                  t.text,
                  t.tools.length ? `_Tools: ${toolSummary(t.tools)}_` : "",
                  working ? "_Working…_" : "",
                ]
                  .filter(Boolean)
                  .join("\n\n")}
                metadata={metadata}
              />
            }
            actions={actions(t.text)}
          />
        );
      })}
    </List>
  );
}
