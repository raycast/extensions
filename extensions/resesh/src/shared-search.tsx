import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { SessionActions } from "./actions";
import { parseWslFilter } from "./providers/wsl";
import type { SessionProvider } from "./providers/types";
import type { MessageSnippet, SessionSearchResult } from "./types";

export function wslDropdownLabel(dir: string, label: string): string {
  const wsl = parseWslFilter(dir);
  return wsl ? `[${wsl.distro}] ${label}` : label;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function groupByProject(results: SessionSearchResult[]): Map<string, SessionSearchResult[]> {
  const groups = new Map<string, SessionSearchResult[]>();
  for (const r of results) {
    const key = r.session.projectDir;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return groups;
}

export function sessionTitle(result: SessionSearchResult): string {
  if (result.session.customTitle) return result.session.customTitle;
  if (result.session.firstUserPrompt) {
    const prompt = result.session.firstUserPrompt.replace(/\n/g, " ").trim();
    return prompt.length > 80 ? prompt.slice(0, 80) + "..." : prompt;
  }
  return result.session.sessionId.slice(0, 8);
}

export function formatTime(timestamp: string | null): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function snippetToMarkdown(msg: MessageSnippet, assistantLabel: string): string {
  const label = msg.source === "user" ? "You" : assistantLabel;
  const time = formatTime(msg.timestamp);
  const header = time ? `**${label}** \u00a0\u00b7\u00a0 \`${time}\`` : `**${label}**`;
  return `${header}\n\n> ${msg.text.replace(/\n/g, "\n> ")}`;
}

export function sessionDetailMarkdown(
  result: SessionSearchResult,
  isSearching: boolean,
  assistantLabel: string,
): string {
  if (isSearching && result.matches.length > 0) {
    const header = `### ${result.matches.length} Match${result.matches.length > 1 ? "es" : ""}\n\n`;
    return (
      header +
      [...result.matches]
        .reverse()
        .map((m) => snippetToMarkdown(m, assistantLabel))
        .join("\n\n---\n\n")
    );
  }

  if (result.preview.length > 0) {
    return [...result.preview]
      .reverse()
      .map((m) => snippetToMarkdown(m, assistantLabel))
      .join("\n\n---\n\n");
  }

  return "*No content available*";
}

export function SessionSearchView({ provider }: { provider: SessionProvider }) {
  const [searchText, setSearchText] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const debouncedQuery = useDebouncedValue(searchText, 300);
  const isSearching = debouncedQuery.length > 0;

  const { data: projects } = usePromise(() => provider.discoverProjects());

  const abortable = useRef<AbortController>(null);
  const { data: results, isLoading } = usePromise(
    (q: string, f: string | null) => provider.searchSessions(q, f),
    [debouncedQuery, projectFilter === "all" ? null : projectFilter],
    { abortable },
  );

  const grouped = useMemo(
    () => (results ? groupByProject(results) : new Map<string, SessionSearchResult[]>()),
    [results],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={provider.searchPlaceholder}
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Project" value={projectFilter} onChange={setProjectFilter}>
          <List.Dropdown.Item title="All Projects" value="all" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Section title="Projects">
            {projects?.map((p) => (
              <List.Dropdown.Item
                key={p.dir}
                title={wslDropdownLabel(p.dir, p.label)}
                value={p.dir}
                icon={Icon.Folder}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {results?.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No sessions found"
          description={searchText ? "Try a different search term" : provider.emptyStateText}
        />
      ) : (
        Array.from(grouped.entries()).map(([projectDir, items]) => (
          <List.Section
            key={projectDir}
            title={
              items[0].session.wslDistro
                ? `[${items[0].session.wslDistro}] ${items[0].session.projectLabel}`
                : items[0].session.projectLabel
            }
            subtitle={`${items.length} session${items.length > 1 ? "s" : ""}`}
          >
            {items.map((result) => (
              <List.Item
                key={result.session.sessionId}
                icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
                title={sessionTitle(result)}
                detail={
                  <List.Item.Detail markdown={sessionDetailMarkdown(result, isSearching, provider.assistantLabel)} />
                }
                actions={
                  <SessionActions session={result.session} resumeCommand={provider.resumeCommand(result.session)} />
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
