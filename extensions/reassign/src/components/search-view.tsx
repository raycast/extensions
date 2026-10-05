import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { SearchEvent, searchEvents } from "../lib/api";
import { needsSignIn } from "../lib/envelope";
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
  // Tag each resolved payload with the query it was issued for. On the
  // intermediate commit after an args change, `keepPreviousData` republishes
  // the *previous* query's result as `data` while `isLoading` is still false
  // (the passive effect that starts the new fetch and flips `isLoading` back to
  // true runs after this commit). Without the tag, `data` for the stale query
  // reads as "settled" for the current query and the EmptyView copy asserts a
  // definitive verdict ("No matches" / "Could not search") before the new fetch
  // has started. `fresh` is the result only when it matches the current query;
  // rows still read from the laggy `data` so `keepPreviousData` keeps the prior
  // query's rows on screen while the new one loads.
  const { data, isLoading, revalidate } = useCachedPromise(
    async (q: string) => ({ query: q, result: await searchEvents(q) }),
    [query],
    { execute: query.length > 0, keepPreviousData: true },
  );

  const fresh = data && data.query === query ? data.result : undefined;
  const failure = fresh && !fresh.ok ? fresh : undefined;
  // Only a sign-in or Pro refusal leaves the search. Other errors keep the query editable.
  if (failure && (needsSignIn(failure.code) || failure.code === "permission")) return refusalView(failure, revalidate);

  const events = query.length === 0 || !data?.result?.ok ? [] : data.result.data.events;
  // `fresh` is undefined until the *current* query has a settled result, and
  // `isLoading` is true while its fetch is in flight. Either condition keeps the
  // copy neutral, so the view never asserts "No matches" (or treats a laggy old
  // failure as current) before the server has answered the query now in the bar.
  const searching = query.length > 0 && (fresh === undefined || isLoading);
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
      {failure && !isLoading ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not search"
          description={failure.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query.length === 0 ? "Search your blocks" : searching ? "Searching…" : "No matches"}
          description={
            query.length === 0
              ? "Type a word to find a block by name, from the last 7 days to the next 30."
              : searching
                ? `Finding blocks that match “${query}”.`
                : `Nothing matches “${query}”.`
          }
        />
      )}
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
