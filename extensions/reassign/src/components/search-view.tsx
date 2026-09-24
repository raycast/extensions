import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { SearchEvent, searchEvents } from "../lib/api";
import { datePart, formatRange, relativeDayLabel, todayISO } from "../lib/format";
import { WEB_BASE, webDayUrl } from "../lib/wire";
import { refusalView } from "./states";

/**
 * A server-side name search, from 7 days ago to 30 days ahead. The search bar
 * drives the query (throttled). Results group by date; Enter opens the block in
 * the web app. A row carries no inline edit.
 * Reused as a pushed view from Agenda (⌘F).
 */
export function SearchView(props: { initialQuery?: string }) {
  const [text, setText] = useState(props.initialQuery ?? "");
  const query = text.trim();
  const { data, isLoading, revalidate } = useCachedPromise((q: string) => searchEvents(q), [query], {
    execute: query.length > 0,
    keepPreviousData: true,
  });

  if (query.length > 0 && data && !data.ok) return refusalView(data, revalidate);

  const events = query.length === 0 || !data?.ok ? [] : data.data.events;
  const todayIso = todayISO();
  const groups = groupByDate(events);

  return (
    <List
      isLoading={isLoading}
      throttle
      searchText={text}
      onSearchTextChange={setText}
      navigationTitle="Search Blocks"
      searchBarPlaceholder="Search blocks by name"
    >
      {groups.map(([date, rows]) => (
        <List.Section key={date} title={relativeDayLabel(date, todayIso)} subtitle={String(rows.length)}>
          {rows.map((event) => (
            <List.Item
              key={`${event.id}-${event.start}`}
              icon={Icon.Calendar}
              title={event.name || "(untitled)"}
              accessories={[{ text: formatRange(event) }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Block in Reassign"
                    url={webDayUrl(datePart(event.start), event.id)}
                  />
                  <Action.OpenInBrowser title="Open Reassign" url={WEB_BASE} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query.length === 0 ? "Search your blocks" : "No matches"}
        description={
          query.length === 0
            ? "Type a word to find a block by name, from the last 7 days to the next 30."
            : `Nothing matches “${query}”.`
        }
      />
    </List>
  );
}

/** Group results by date, each group's rows sorted by start, groups by date. */
function groupByDate(events: SearchEvent[]): [string, SearchEvent[]][] {
  const byDate = new Map<string, SearchEvent[]>();
  for (const event of events) {
    const date = datePart(event.start);
    const rows = byDate.get(date) ?? [];
    rows.push(event);
    byDate.set(date, rows);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => [date, rows.slice().sort((x, y) => x.start.localeCompare(y.start))]);
}
