import { Action, ActionPanel, Color, Icon, List, closeMainWindow, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { callidayJSON, fmt, SearchItem, SearchResults } from "./lib/cli";
import { CallidayErrorView } from "./lib/error-view";

const RANGES = [
  { days: "1", title: "Today" },
  { days: "7", title: "Last 7 days" },
  { days: "30", title: "Last 30 days" },
];

/** The text that filters the app's All-Activities list.
 *
 * The list matches on app, title, site, file path and project — not on the
 * full URL — so a page has to travel by its title, and a file by its path. */
function filterText(item: SearchItem): string {
  return item.path ?? item.title;
}

function deepLink(item: SearchItem): string {
  return `calliday://timeline?search=${encodeURIComponent(filterText(item))}`;
}

function icon(item: SearchItem) {
  if (item.kind === "webpage") return { source: Icon.Globe, tintColor: Color.Blue };
  return item.path
    ? { source: Icon.Document, tintColor: Color.Green }
    : { source: Icon.Window, tintColor: Color.SecondaryText };
}

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [days, setDays] = useState("7");

  const { data, error, isLoading } = usePromise(
    async (q: string, d: string) => {
      // One character matches most of the database and helps nobody.
      if (q.trim().length < 2) return undefined;
      // Arguments go straight to execFile — no shell, so the query needs no
      // escaping and can contain anything the user types.
      return callidayJSON<SearchResults>(["search", q.trim(), "--days", d, "--limit", "50"]);
    },
    [query, days],
    { failureToastOptions: { title: "Couldn't search Calliday" } },
  );

  const results = data?.results ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search documents and pages you've spent time in…"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="How far back" value={days} onChange={setDays}>
          {RANGES.map((r) => (
            <List.Dropdown.Item key={r.days} value={r.days} title={r.title} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <CallidayErrorView error={error} />
      ) : query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your tracked activity"
          description="Find a file or a page by name, path, or URL — then jump to it on the timeline or open it."
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Nothing matched"
          description={`No document or page matching “${query.trim()}” in this range.`}
        />
      ) : (
        results.map((item, index) => (
          <List.Item
            key={`${item.kind}-${item.path ?? item.url ?? item.title}-${index}`}
            icon={icon(item)}
            title={item.title}
            subtitle={item.path ?? item.url ?? item.app}
            accessories={[{ text: fmt(item.seconds) }, { text: item.app }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Show on Timeline"
                    icon={Icon.Clock}
                    onAction={async () => {
                      await open(deepLink(item));
                      await closeMainWindow();
                    }}
                  />
                  {item.url && <Action.OpenInBrowser title="Open Page" url={item.url} />}
                  {item.path && <Action.Open title="Open File" target={item.path} />}
                  {item.path && <Action.ShowInFinder path={item.path} />}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {item.path && <Action.CopyToClipboard title="Copy Path" content={item.path} />}
                  {item.url && <Action.CopyToClipboard title="Copy URL" content={item.url} />}
                  <Action.CopyToClipboard title="Copy Name" content={item.title} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
