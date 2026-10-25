import { Action, ActionPanel, Color, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AskView } from "./ask-view";
import { attempt, favicon, OpenActions, prefs, spaceColor, spaceLabel, TabActions, useYabWindow } from "./components";
import { addressURL, bookmarks, domainOf, looksLikeAddress, searchURL, spaceInfos } from "./data";
import { HistoryItem, useHistory } from "./history";
import { suggestions } from "./suggestions";
import { openSmallWindow, openURL } from "./yab";

function matches(text: string, ...fields: string[]): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = fields.join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

export default function Command() {
  const [text, setText] = useState("");
  const { push } = useNavigation();
  const { data: window, isLoading: loadingTabs, revalidate } = useYabWindow();
  const spaces = useMemo(() => spaceInfos(), []);
  const marks = useMemo(() => bookmarks(), []);
  const onScreen = window?.spaces.find((s) => s.active);
  const trimmed = text.trim();

  const { data: pages, isLoading: loadingHistory } = useHistory(trimmed, { limit: trimmed ? 8 : 6 });
  const { data: suggested } = useCachedPromise(
    async (t: string) => (t && !looksLikeAddress(t) ? suggestions(t) : []),
    [trimmed],
    { keepPreviousData: true },
  );

  const tabs = (window?.tabs ?? [])
    .filter((t) => !trimmed || matches(trimmed, t.title, t.url, t.spaceTitle))
    .slice(0, trimmed ? 6 : 8);
  const shownMarks = trimmed ? marks.filter((b) => matches(trimmed, b.title, b.url, ...b.path)).slice(0, 4) : [];
  const openURLs = new Set((window?.tabs ?? []).map((t) => t.url));
  const historyRows = (pages ?? []).filter((p) => !openURLs.has(p.url));
  const smallFirst = prefs().primary === "small";

  const go = async (url: string, small: boolean) =>
    attempt("Couldn't open it", () => (small ? openSmallWindow(url) : openURL(url, "tab")));

  return (
    <List
      isLoading={loadingTabs || loadingHistory}
      filtering={false}
      throttle
      onSearchTextChange={setText}
      searchBarPlaceholder="Search tabs, history, bookmarks or the web…"
    >
      {trimmed && looksLikeAddress(trimmed) ? (
        <List.Section title="Address">
          <List.Item
            icon={favicon(addressURL(trimmed))}
            title={`Open ${trimmed}`}
            actions={
              <ActionPanel>
                <Action title="Open" icon={Icon.Globe} onAction={() => go(addressURL(trimmed), smallFirst)} />
                <Action
                  title={smallFirst ? "Open in New Tab" : "Open in Small Window"}
                  icon={Icon.AppWindow}
                  onAction={() => go(addressURL(trimmed), !smallFirst)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title={trimmed ? "Open Tabs" : `Open Tabs${onScreen ? ` · ${spaceLabel(onScreen)}` : ""}`}>
        {tabs.map((tab) => {
          const space = window?.spaces.find((s) => s.id === tab.spaceId);
          return (
            <List.Item
              key={tab.id}
              icon={favicon(tab.url)}
              title={tab.title || domainOf(tab.url)}
              subtitle={domainOf(tab.url)}
              accessories={[
                ...(space && (!onScreen || space.id !== onScreen.id)
                  ? [{ tag: { value: spaceLabel(space), color: spaceColor(space.color) } }]
                  : []),
                { text: "Switch", icon: { source: Icon.Switch, tintColor: Color.SecondaryText } },
              ]}
              actions={<TabActions tab={tab} tabs={window?.tabs ?? []} onChange={revalidate} />}
            />
          );
        })}
      </List.Section>

      <List.Section title={trimmed ? "History" : "Recently Visited"}>
        {historyRows.map((page) => (
          <HistoryItem key={page.key} page={page} tabs={window?.tabs} spaces={spaces} showDetail={false} />
        ))}
      </List.Section>

      <List.Section title="Bookmarks">
        {shownMarks.map((b) => (
          <List.Item
            key={b.id}
            icon={favicon(b.url)}
            title={b.title}
            subtitle={b.path.join(" › ") || domainOf(b.url)}
            accessories={[{ icon: { source: Icon.Bookmark, tintColor: Color.SecondaryText } }]}
            actions={
              <ActionPanel>
                <OpenActions url={b.url} title={b.title} tabs={window?.tabs} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {trimmed && !looksLikeAddress(trimmed) ? (
        <List.Section title="Search">
          {[trimmed, ...(suggested ?? []).filter((s) => s.toLowerCase() !== trimmed.toLowerCase()).slice(0, 4)].map(
            (q) => (
              <List.Item
                key={`q-${q}`}
                icon={Icon.MagnifyingGlass}
                title={q}
                actions={
                  <ActionPanel>
                    <Action
                      title="Search in Yab"
                      icon={Icon.MagnifyingGlass}
                      onAction={async () => go(await searchURL(q, onScreen?.id), smallFirst)}
                    />
                    <Action
                      title={smallFirst ? "Search in New Tab" : "Search in Small Window"}
                      icon={Icon.AppWindow}
                      onAction={async () => go(await searchURL(q, onScreen?.id), !smallFirst)}
                    />
                    <Action
                      title="Ask Yab"
                      icon={Icon.SpeechBubble}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={() => push(<AskView prompt={q} />)}
                    />
                  </ActionPanel>
                }
              />
            ),
          )}
        </List.Section>
      ) : null}

      {trimmed ? (
        <List.Section title="Agent">
          <List.Item
            icon={{ source: Icon.SpeechBubbleActive, tintColor: Color.Orange }}
            title={`Ask Yab: “${trimmed}”`}
            subtitle="done in Yab, answered here"
            actions={
              <ActionPanel>
                <Action title="Ask Yab" icon={Icon.SpeechBubble} onAction={() => push(<AskView prompt={trimmed} />)} />
                <Action
                  title="Ask in Yab's Window"
                  icon={Icon.Window}
                  shortcut={Keyboard.Shortcut.Common.Open}
                  onAction={async () => {
                    const { askInYab } = await import("./yab");
                    await attempt("Couldn't open ⌘J", () => askInYab(trimmed, true));
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
