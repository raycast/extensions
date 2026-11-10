import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { useEffect, useRef, useState } from "react";
import { fail, jump, move } from "./actions";
import { AgentState, capture, cleanName, listPanes, listSessions, Pane, tildify, workspaceNames } from "./tuios";

const STATE: Partial<Record<AgentState, { glyph: string; color: Color; label: string }>> = {
  needs_input: { glyph: "▲", color: Color.Yellow, label: "needs you" },
  errored: { glyph: "✗", color: Color.Red, label: "errored" },
  working: { glyph: "●", color: Color.Blue, label: "working" },
  done: { glyph: "✳", color: Color.Green, label: "done" },
  idle: { glyph: "○", color: Color.SecondaryText, label: "idle" },
};

/** Every field a person might remember a pane by, best first. A hit in an earlier field ranks higher. */
function fields(p: Pane, tab?: string): string[] {
  return [
    cleanName(p.name),
    cleanName(p.title),
    basename(p.cwd),
    p.command,
    tab ?? "",
    `tab ${p.workspace}`,
    p.session,
    p.cwd,
  ].map((f) => (f ?? "").toLowerCase());
}

/**
 * Every word typed must appear in some field. Returns a rank (higher is better), or -1 for no match.
 * Whole words beat hits inside a word ("port" barely matches "reports"); earlier fields beat later ones.
 */
function score(p: Pane, q: string, tab?: string): number {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const fs = fields(p, tab);
  let total = 0;
  for (const w of words) {
    let best = -1;
    fs.forEach((f, i) => {
      const at = f.indexOf(w);
      if (at < 0) return;
      const boundary = at === 0 || /[^\p{L}\p{N}]/u.test(f[at - 1]);
      const weight = fs.length - i;
      const exact = f === w ? 8 : 0;
      best = Math.max(best, boundary ? weight * 10 + (at === 0 ? 5 : 3) + exact : weight * 2);
    });
    if (best < 0) return -1;
    total += best;
  }
  return total;
}

async function load() {
  const [panes, sessions] = await Promise.all([listPanes(), listSessions()]);
  const order = sessions.sort((a, b) => b.last_active - a.last_active).map((s) => s.name);
  const names: Record<string, Record<number, string>> = Object.fromEntries(
    await Promise.all(order.map(async (s) => [s, await workspaceNames(s).catch(() => ({}))] as const)),
  );
  return { panes, order, names };
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Panes }>) {
  const query = props.arguments.query?.trim() ?? "";
  const [search, setSearch] = useState(query);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, revalidate } = useCachedPromise(load, [], {
    keepPreviousData: true,
    onError: (e) => fail("tuios is not answering", e),
  });

  // Typed straight from root search: one match means jump without showing the list.
  const tried = useRef(false);
  useEffect(() => {
    if (!query || !data || isLoading || tried.current) return;
    tried.current = true;
    const hits = data.panes.filter((p) => score(p, query, data.names[p.session]?.[p.workspace]) >= 0);
    if (hits.length === 1) jump(hits[0]);
  }, [data, isLoading]);

  const panes = data?.panes ?? [];
  const sessions = data?.order ?? [];
  const tabOf = (p: Pane) => data?.names[p.session]?.[p.workspace];

  // No search: group by session and tab. Searching: one list, best match first, so Enter takes the top hit.
  const groups: [string, Pane[]][] = [];
  if (search.trim()) {
    const ranked = panes
      .map((p) => ({ p, s: score(p, search, tabOf(p)) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || sessions.indexOf(a.p.session) - sessions.indexOf(b.p.session));
    if (ranked.length)
      groups.push([`${ranked.length} match${ranked.length === 1 ? "" : "es"}`, ranked.map((x) => x.p)]);
  } else {
    const by = new Map<string, Pane[]>();
    for (const s of sessions) {
      for (const p of panes.filter((x) => x.session === s).sort((a, b) => a.workspace - b.workspace)) {
        const tab = tabOf(p);
        const key = `${p.session} · ${tab ? tab : `tab ${p.workspace}`}`;
        by.set(key, [...(by.get(key) ?? []), p]);
      }
    }
    groups.push(...by.entries());
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchText={search}
      onSearchTextChange={setSearch}
      filtering={false}
      searchBarPlaceholder="Find a pane by name, title, program or folder…"
      onSelectionChange={setSelected}
    >
      <List.EmptyView
        icon={Icon.Window}
        title="No panes match"
        description="Try a folder name or the program running in it."
      />
      {groups.map(([title, list]) => (
        <List.Section key={title} title={title}>
          {list.map((p) => (
            <PaneItem
              key={p.window_id}
              pane={p}
              tab={tabOf(p)}
              searching={!!search.trim()}
              live={showDetail && selected === p.window_id}
              showDetail={showDetail}
              sessions={sessions}
              toggleDetail={() => setShowDetail((v) => !v)}
              refresh={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function PaneItem(props: {
  pane: Pane;
  tab?: string;
  searching: boolean;
  live: boolean;
  showDetail: boolean;
  sessions: string[];
  toggleDetail: () => void;
  refresh: () => void;
}) {
  const { pane: p, showDetail } = props;
  const st = p.agent_state ? STATE[p.agent_state] : undefined;
  const name = cleanName(p.name || p.title || p.command || "pane");
  const title = cleanName(p.title);
  const screen = usePromise((x: Pane) => capture(x), [p], { execute: props.live });
  const where = `${p.session} · ${props.tab ?? `tab ${p.workspace}`}`;

  const accessories: List.Item.Accessory[] = showDetail
    ? []
    : [
        ...(p.focused ? [{ icon: Icon.Eye, tooltip: "Focused in its session" }] : []),
        ...(st ? [{ tag: { value: st.label, color: st.color } }] : []),
        ...(props.searching ? [{ text: where, tooltip: "Session · tab" }] : []),
        { text: p.command || "", tooltip: "Running" },
        { text: tildify(p.cwd), tooltip: p.cwd },
      ];

  return (
    <List.Item
      id={p.window_id}
      icon={st ? { source: Icon.CircleFilled, tintColor: st.color } : Icon.Terminal}
      title={name}
      subtitle={!showDetail && title && title !== name ? title : undefined}
      accessories={accessories}
      detail={
        <List.Item.Detail
          isLoading={screen.isLoading}
          markdown={screen.data !== undefined ? "```\n" + screen.data.trimEnd() + "\n```" : ""}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Where" text={where} />
              <List.Item.Detail.Metadata.Label title="Running" text={p.command || "—"} />
              <List.Item.Detail.Metadata.Label title="Folder" text={tildify(p.cwd)} />
              {st && <List.Item.Detail.Metadata.Label title="Agent" text={`${st.glyph} ${st.label}`} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Jump to Pane" icon={Icon.ArrowRight} onAction={() => jump(p)} />
            {props.sessions.length > 1 && (
              <ActionPanel.Submenu
                title="Move to Session"
                icon={Icon.ArrowNe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              >
                {props.sessions
                  .filter((s) => s !== p.session)
                  .map((s) => (
                    <Action key={s} title={s} onAction={() => move(p, s, props.refresh)} />
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
              content={p.window_id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {p.cwd && (
              <Action.ShowInFinder
                title="Open Folder in Finder"
                path={p.cwd}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
