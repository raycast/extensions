import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fail, jump, move } from "./actions";
import { ErrorView } from "./error-view";
import {
  Agent,
  AgentState,
  capture,
  cleanName,
  leaveNote,
  listAgents,
  listSessions,
  peekPrompt,
  Prompt,
  queueTask,
  respond,
  RespondAction,
  tildify,
} from "./tuios";

// Status glyphs as tuios draws them, waiting first.
const SECTIONS: { state: AgentState; title: string; glyph: string; color: Color }[] = [
  { state: "needs_input", title: "Needs you", glyph: "▲", color: Color.Yellow },
  { state: "errored", title: "Errored", glyph: "✗", color: Color.Red },
  { state: "working", title: "Working", glyph: "●", color: Color.Blue },
  { state: "done", title: "Done", glyph: "✳", color: Color.Green },
  { state: "idle", title: "Idle", glyph: "○", color: Color.SecondaryText },
];
const OTHER = { title: "Shells & other panes", glyph: "$", color: Color.SecondaryText };

const REFRESH_MS = 3000;

function sectionOf(s: AgentState) {
  return SECTIONS.find((x) => x.state === s) ?? { ...OTHER, state: s };
}

function ago(ns: number): string {
  if (!ns) return "";
  const s = Math.max(0, Math.round((Date.now() - ns / 1e6) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function fence(text: string) {
  return "```\n" + text.replace(/```/g, "ˋˋˋ").trimEnd() + "\n```";
}

export default function Command() {
  const [showDetail, setShowDetail] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [scope, setScope] = useState<"agents" | "all">("agents");
  const {
    data: agents = [],
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listAgents, [scope === "all"], {
    keepPreviousData: true,
    failureToastOptions: { title: "tuios is not answering" },
  });
  const { data: sessions = [] } = useCachedPromise(listSessions, [], { keepPreviousData: true });
  const sessionNames = sessions.map((s) => s.name);

  useEffect(() => {
    const t = setInterval(revalidate, REFRESH_MS);
    return () => clearInterval(t);
  }, [revalidate]);

  const groups = new Map<string, Agent[]>();
  for (const a of agents) {
    const key = SECTIONS.some((s) => s.state === a.state) ? a.state : "other";
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const order = [...SECTIONS.map((s) => s.state as string), "other"];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search by name, session, folder…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" storeValue onChange={(v) => setScope(v as "agents" | "all")}>
          <List.Dropdown.Item title="Agents" value="agents" />
          <List.Dropdown.Item title="All Panes" value="all" />
        </List.Dropdown>
      }
      onSelectionChange={setSelected}
    >
      {error && !agents.length ? (
        <ErrorView error={error} retry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Terminal}
          title={scope === "all" ? "No panes" : "No agents running"}
          description="Start one with the Start Agent command, or in any tuios pane."
        />
      )}
      {order.map((key) => {
        const list = groups.get(key);
        if (!list?.length) return null;
        const sec = sectionOf(key as AgentState);
        return (
          <List.Section key={key} title={sec.title} subtitle={String(list.length)}>
            {list.map((a) => (
              <AgentItem
                key={a.window_id}
                agent={a}
                selected={selected === a.window_id}
                showDetail={showDetail}
                sessions={sessionNames}
                toggleDetail={() => setShowDetail((v) => !v)}
                refresh={revalidate}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function AgentItem(props: {
  agent: Agent;
  selected: boolean;
  showDetail: boolean;
  sessions: string[];
  toggleDetail: () => void;
  refresh: () => void;
}) {
  const { agent: a, selected, showDetail } = props;
  const sec = sectionOf(a.state);
  const name = cleanName(a.name);
  const where = `${a.session} · tab ${a.workspace}`;
  const waiting = a.state === "needs_input";

  // Only the selected row reads its pane / prompt, and only while the detail is shown.
  // usePromise compares arguments by value, so re-read on a timer for a live preview.
  const live = selected && showDetail;
  const screen = usePromise((ag: Agent) => capture(ag), [a], { execute: live });
  const prompt = usePromise((ag: Agent) => peekPrompt(ag), [a], { execute: selected && waiting });
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      screen.revalidate();
      if (waiting) prompt.revalidate();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [live, waiting, screen.revalidate, prompt.revalidate]);

  const accessories: List.Item.Accessory[] = showDetail
    ? []
    : [
        ...(a.unread ? [{ icon: Icon.Envelope, text: String(a.unread), tooltip: "Unread mail" }] : []),
        { tag: { value: a.session, color: sec.color } },
        { text: ago(a.agent_state_at), tooltip: "Since last state change" },
      ];

  const p = prompt.data;
  const md = [
    waiting && p ? `**${p.message || "Waiting for you"}**\n\n${fence(p.lines.join("\n"))}\n\n---\n` : "",
    a.message && !waiting ? `> ${a.message.replace(/\n/g, " ")}\n\n` : "",
    screen.data !== undefined ? fence(screen.data) : "",
  ].join("");

  return (
    <List.Item
      id={a.window_id}
      icon={{ source: Icon.CircleFilled, tintColor: sec.color }}
      title={name}
      subtitle={showDetail ? undefined : where}
      keywords={[a.session, a.cwd, a.harness_id, a.message].filter(Boolean)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          isLoading={screen.isLoading || prompt.isLoading}
          markdown={md}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="State">
                <List.Item.Detail.Metadata.TagList.Item text={`${sec.glyph} ${a.state}`} color={sec.color} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Where" text={where} />
              <List.Item.Detail.Metadata.Label title="Folder" text={tildify(a.cwd)} />
              <List.Item.Detail.Metadata.Label title="Harness" text={a.harness_id || "—"} />
              <List.Item.Detail.Metadata.Label title="Since" text={ago(a.agent_state_at)} />
              {a.unread ? <List.Item.Detail.Metadata.Label title="Unread mail" text={String(a.unread)} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Jump to Pane" icon={Icon.ArrowRight} onAction={() => jump(a)} />
            {waiting && p?.answerable ? <PromptActions agent={a} prompt={p} done={props.refresh} /> : null}
            <Action.Push
              title="Send Message"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={<MessageForm agent={a} />}
            />
            {props.sessions.length > 1 && (
              <ActionPanel.Submenu
                title="Move to Session"
                icon={Icon.ArrowNe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              >
                {props.sessions
                  .filter((s) => s !== a.session)
                  .map((s) => (
                    <Action key={s} title={s} onAction={() => move(a, s, props.refresh)} />
                  ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showDetail ? "Hide Pane Preview" : "Show Pane Preview"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={props.toggleDetail}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.refresh}
            />
            <Action.CopyToClipboard
              title="Copy Pane ID"
              content={a.window_id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.ShowInFinder title="Open Folder in Finder" path={a.cwd} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PromptActions({ agent, prompt, done }: { agent: Agent; prompt: Prompt; done: () => void }) {
  const answer = async (label: string, action: RespondAction, value?: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `${label}…` });
    try {
      // The prompt id is the one shown in the preview; tuios refuses if the prompt changed since.
      await respond(agent, prompt.prompt_id, action, value);
      toast.style = Toast.Style.Success;
      toast.title = `${label}: ${cleanName(agent.name)}`;
      done();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${label.toLowerCase()}`;
      toast.message = e instanceof Error ? e.message : String(e);
    }
  };
  const has = (x: string) => prompt.actions.includes(x);

  return (
    <>
      {has("approve") && (
        <Action
          title="Approve"
          icon={{ source: Icon.Check, tintColor: Color.Green }}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "y" }}
          onAction={() => answer("Approve", "approve")}
        />
      )}
      {has("approve_always") && (
        <Action
          title="Approve Always"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          shortcut={{ modifiers: ["ctrl", "cmd", "shift"], key: "y" }}
          onAction={() => answer("Approve always", "approve_always")}
        />
      )}
      {has("deny") && (
        <Action
          title="Deny"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "n" }}
          onAction={() => answer("Deny", "deny")}
        />
      )}
      {has("choose") && prompt.options.length > 0 && (
        <ActionPanel.Submenu
          title="Choose Option"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
        >
          {prompt.options.map((o) => (
            <Action
              key={o.n}
              title={`${o.n}. ${o.label}`}
              onAction={() => answer(`Choose ${o.n}`, "choose", String(o.n))}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}

function MessageForm({ agent }: { agent: Agent }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Message · ${cleanName(agent.name)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.Envelope}
            onSubmit={async (v: { text: string; mode: string }) => {
              if (!v.text.trim()) return;
              try {
                if (v.mode === "queue") await queueTask(agent, v.text);
                else await leaveNote(agent, v.text);
                await showToast({
                  style: Toast.Style.Success,
                  title: v.mode === "queue" ? "Queued as next task" : "Note left",
                });
                pop();
              } catch (e) {
                await fail("Could not send", e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`${agent.session} · tab ${agent.workspace} · ${agent.state}`} />
      <Form.TextArea id="text" title="Message" placeholder="What should the agent know or do?" autoFocus />
      <Form.Dropdown id="mode" title="How" defaultValue="note">
        <Form.Dropdown.Item value="note" title="Leave a note (inbox, types nothing)" />
        <Form.Dropdown.Item value="queue" title="Queue as next task (typed when it is idle)" />
      </Form.Dropdown>
    </Form>
  );
}
