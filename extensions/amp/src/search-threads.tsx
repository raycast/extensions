import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { listProjects, listThreads, projectSlug, searchThreads, watchLiveThreads, type LiveThread } from "./lib/amp";
import { ThreadListItem } from "./components/thread-list-item";
import { RecoveryActions } from "./lib/ui";

const FILTERS = [
  { title: "Recent", value: "" },
  { title: "Mine, Last 24h", value: "author:me after:1d" },
  { title: "Mine, Last 7 Days", value: "author:me after:7d" },
  { title: "With Pull Requests", value: "pr:true" },
  { title: "With Commits", value: "commit:true" },
  { title: "Pinned", value: "pinned:true" },
  { title: "Archived", value: "archived:true" },
];

export default function SearchThreads() {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const query = [text.trim(), filter].filter(Boolean).join(" ");
  const { data: projects } = useCachedPromise(listProjects);

  const { data, isLoading, revalidate, error } = useCachedPromise(
    (q: string) => (q ? searchThreads(q) : listThreads()),
    [query],
    { keepPreviousData: true },
  );

  // Mark threads that are working right now, updated live.
  const [live, setLive] = useState<Map<string, LiveThread>>(new Map());
  useEffect(() => {
    let stop = () => undefined as void;
    let retry: NodeJS.Timeout | undefined;
    const connect = () => {
      stop = watchLiveThreads(
        (threads) => setLive(new Map(threads.map((t) => [t.id, t]))),
        // The stream ended, so its working states are stale: drop them and reconnect.
        () => {
          setLive(new Map());
          retry = setTimeout(connect, 5_000);
        },
      );
    };
    connect();
    return () => {
      clearTimeout(retry);
      stop();
    };
  }, []);

  const threads = data ?? [];
  const working = threads.filter((t) => live.get(t.id)?.working);
  const rest = threads.filter((t) => !live.get(t.id)?.working);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setText}
      searchBarPlaceholder="Search threads: keywords, repo:, author:, after:7d, pr:123…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter} storeValue>
          <List.Dropdown.Section>
            {FILTERS.map((f) => (
              <List.Dropdown.Item key={f.title} title={f.title} value={f.value} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Projects">
            {(projects ?? []).map((p) => (
              <List.Dropdown.Item
                key={p.id}
                title={projectSlug(p)}
                icon={Icon.Folder}
                value={`repo:${p.repositoryURL.replace(/^https?:\/\//, "")}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && !threads.length ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't reach Amp"
          description={error.message}
          actions={<RecoveryActions onRetry={revalidate} />}
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No threads found"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search on Ampcode.com"
                url={`https://ampcode.com/threads?q=${encodeURIComponent(query)}`}
              />
            </ActionPanel>
          }
        />
      )}
      {working.length > 0 && (
        <List.Section title="Working" subtitle={String(working.length)}>
          {working.map((t) => (
            <ThreadListItem key={t.id} thread={t} live={live.get(t.id)} onChange={revalidate} />
          ))}
        </List.Section>
      )}
      <List.Section title={query ? "Results" : "Recent"} subtitle={String(rest.length)}>
        {rest.map((t) => (
          <ThreadListItem key={t.id} thread={t} live={live.get(t.id)} onChange={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}
