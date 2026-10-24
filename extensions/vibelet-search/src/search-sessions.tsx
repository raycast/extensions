import { Action, ActionPanel, Color, Detail, environment, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import { SessionActions } from "./components/session-actions";
import { findMatchIndex, formatRelativeTime, formatSessionMarkdown, renderMessage } from "./format";
import { ensureContentIndex, searchContentIndex, sessionKeyOf, type IndexedMessageHit } from "./index";
import { loadSessionMessages } from "./load-messages";
import { loadAllSessionMetas, type SessionLoadResult } from "./scanners";
import { SOURCE_BADGE, SOURCE_LABEL } from "./source-display";
import type { SessionMeta, SessionSource } from "./types";

const SOURCE_ORDER: SessionSource[] = ["claude-cli", "claude-app", "codex-cli", "codex-app"];

/**
 * Filter selectable via `cmd+K` (List.Dropdown). "claude"/"codex" merge the cli+app pair;
 * `project:<path>` filters to one project directory.
 */
type FilterKey = "all" | "claude" | "codex" | SessionSource | `project:${string}`;

function matchesFilter(meta: SessionMeta, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "claude":
      return meta.source === "claude-cli" || meta.source === "claude-app";
    case "codex":
      return meta.source === "codex-cli" || meta.source === "codex-app";
    default:
      if (filter.startsWith("project:")) {
        return meta.projectPath === filter.slice("project:".length);
      }
      return meta.source === filter;
  }
}

/** Show the last two path segments so long cwd strings fit in a dropdown item / row. */
function shortPath(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts.slice(-2).join("/");
}

function sourceIcon(source: SessionSource): { source: Icon; tintColor: Color } {
  switch (source) {
    case "claude-cli":
      return { source: Icon.Terminal, tintColor: Color.Orange };
    case "claude-app":
      return { source: Icon.AppWindow, tintColor: Color.Purple };
    case "codex-cli":
      return { source: Icon.Code, tintColor: Color.Green };
    case "codex-app":
      return { source: Icon.AppWindow, tintColor: Color.Blue };
  }
}

const DETAIL_TRUNCATE_BYTES = 3000;

/** Caches (meta + content index) live here; delete to rebuild everything from scratch. */
const CACHE_DIR = path.join(environment.supportPath, "cache");

// Cap the initial render at 200 items to keep Raycast's List responsive.
// Users with thousands of sessions can still find anything via the search bar — search
// scans the full meta list (titles) and full file contents (via the content index), not just the visible window.
const MAX_DISPLAY = 200;
const CONTENT_SEARCH_LIMIT = 100;

/** Debounce content search so fast typing doesn't spawn a ripgrep per keystroke. */
const SEARCH_DEBOUNCE_MS = 150;

function dirtySignature(sd: SessionLoadResult | undefined): number {
  if (!sd) return 0;
  return sd.changedKeys.length + sd.removedKeys.length;
}

function SessionDetail({ meta, query, focusIndex }: { meta: SessionMeta; query?: string; focusIndex?: number }) {
  // Pass meta.id as args so useCachedPromise's cache key is unique per session.
  // Without this, navigating between sessions would briefly show the previous session's messages.
  const { data: messages, isLoading } = useCachedPromise(
    async (id: string) => {
      void id; // id is part of the cache key, the closure uses meta directly
      return loadSessionMessages(meta);
    },
    [meta.id],
  );

  const markdown = useMemo(() => {
    const sourceLabel = SOURCE_LABEL[meta.source];
    const sourceBadge = SOURCE_BADGE[meta.source];
    const prSuffix = meta.prUrl ? ` · [PR #${meta.prNumber ?? ""}](${meta.prUrl})` : "";
    const headerOnly =
      `# ${sourceBadge} ${meta.title}\n\n` +
      `${sourceLabel} · \`${meta.projectPath}\` · ${new Date(meta.timestamp).toLocaleString()} · ${messages?.length ?? "…"} messages${prSuffix}\n\n` +
      `---\n\n`;

    if (!messages) return headerOnly + (isLoading ? "*Loading conversation…*" : "*No conversation messages found.*");
    if (messages.length === 0) return headerOnly + "*No conversation messages found.*";

    // A content-index hit carries the exact message index (seq contract); fall back to a
    // linear scan for title hits.
    const matchIdx = focusIndex ?? (query ? findMatchIndex(messages, query) : -1);

    if (matchIdx >= 0 && matchIdx < messages.length) {
      const contextStart = Math.max(0, matchIdx - 1);
      const contextEnd = Math.min(messages.length, matchIdx + 2);
      const matchContext = messages
        .slice(contextStart, contextEnd)
        .map((msg, i) =>
          renderMessage(msg, {
            query,
            marker: contextStart + i === matchIdx ? "🎯" : undefined,
            truncate: DETAIL_TRUNCATE_BYTES,
          }),
        )
        .join("\n\n");

      const fullConversation = formatSessionMarkdown(meta, messages, {
        query,
        truncate: DETAIL_TRUNCATE_BYTES,
      })
        // strip the duplicated header that formatSessionMarkdown adds
        .replace(/^[\s\S]*?---\n\n/, "");

      return (
        headerOnly + `## 🎯 Matched Context\n\n${matchContext}\n\n---\n\n## 📜 Full Conversation\n\n${fullConversation}`
      );
    }

    return formatSessionMarkdown(meta, messages, { query, truncate: DETAIL_TRUNCATE_BYTES });
  }, [isLoading, meta, messages, query, focusIndex]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <SessionActions meta={meta} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchSessions() {
  const [searchText, setSearchText] = useState("");
  // Debounced copy of the query for content search only — title filtering stays instant.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Source/agent filter, toggled via `cmd+K`.
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data: sessionData, isLoading: isLoadingMetas } = useCachedPromise(
    async () => {
      try {
        return await loadAllSessionMetas({ cacheDir: CACHE_DIR });
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load sessions", message: String(e) });
        return { metas: [], changedKeys: [], removedKeys: [] } as SessionLoadResult;
      }
    },
    [],
    { keepPreviousData: true },
  );

  // The content-search closure needs the freshest metas/dirty even when the promise is
  // cached — keep a ref so we never index a stale snapshot.
  const sessionDataRef = useRef(sessionData);
  sessionDataRef.current = sessionData;

  // Content search runs against the merged index asynchronously so the worker event loop
  // stays free for IPC. ensureContentIndex is a no-op unless metas/dirty changed.
  const { data: contentMatches } = useCachedPromise(
    async (q: string, metaCount: number, dirtySig: number): Promise<IndexedMessageHit[]> => {
      void dirtySig; // dependency sentinel — forces a re-run whenever metas changed
      if (!q.trim() || q.length < 2 || metaCount === 0) return [];
      const sd = sessionDataRef.current;
      if (!sd || sd.metas.length === 0) return [];
      try {
        await ensureContentIndex(CACHE_DIR, sd.metas, { changedKeys: sd.changedKeys, removedKeys: sd.removedKeys });
        return await searchContentIndex(CACHE_DIR, q, CONTENT_SEARCH_LIMIT);
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Content search unavailable", message: String(e) });
        return [];
      }
    },
    // dirtySignature in the deps makes the promise re-run (and rebuild the index) whenever
    // metas changed, even if the debounced query didn't.
    [debouncedQuery, sessionData?.metas.length ?? 0, dirtySignature(sessionData)],
  );

  // O(1) sessionKey -> meta lookup, used for merging content-search hits into the list.
  const metaByKey = useMemo(() => {
    const m = new Map<string, SessionMeta>();
    for (const meta of sessionData?.metas ?? []) m.set(sessionKeyOf(meta), meta);
    return m;
  }, [sessionData]);

  // Projects for the cmd+K filter, most-populated first, capped so the dropdown stays light.
  const projects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of sessionData?.metas ?? []) {
      if (!m.projectPath) continue;
      counts.set(m.projectPath, (counts.get(m.projectPath) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([p]) => p);
  }, [sessionData]);

  const filteredSessions = useMemo(() => {
    const allMetas = sessionData?.metas ?? [];
    // Apply the cmd+K source/agent filter first, so search + cap both operate on the scoped set.
    const scoped = allMetas.filter((m) => matchesFilter(m, filter));
    type Rendered = SessionMeta & { matchSnippet?: string; focusIndex?: number };

    if (!searchText.trim()) {
      return scoped.slice(0, MAX_DISPLAY) as Rendered[];
    }

    const lowerQuery = searchText.toLowerCase();
    const seen = new Set<string>();
    const results: Rendered[] = [];

    // Title matches first
    for (const meta of scoped) {
      if (meta.title.toLowerCase().includes(lowerQuery)) {
        results.push(meta);
        seen.add(sessionKeyOf(meta));
      }
    }

    // Then content matches (keyed by sessionKey, O(1) lookup via metaByKey), scoped by the filter too
    if (contentMatches) {
      for (const hit of contentMatches) {
        const meta = metaByKey.get(hit.sessionKey);
        if (meta && matchesFilter(meta, filter) && !seen.has(hit.sessionKey)) {
          results.push({ ...meta, matchSnippet: hit.snippet, focusIndex: hit.msgIndex });
          seen.add(hit.sessionKey);
        }
      }
    }

    return results;
  }, [sessionData, searchText, contentMatches, metaByKey, filter]);

  return (
    <List
      isLoading={isLoadingMetas}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search sessions by title or content..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Sessions" storeValue onChange={(v) => setFilter(v as FilterKey)}>
          <List.Dropdown.Item title="All Sessions" value="all" icon={Icon.AppWindow} />
          <List.Dropdown.Section title="Agent">
            <List.Dropdown.Item title="Claude" value="claude" icon={sourceIcon("claude-cli")} />
            <List.Dropdown.Item title="Codex" value="codex" icon={sourceIcon("codex-cli")} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Source">
            {SOURCE_ORDER.map((s) => (
              <List.Dropdown.Item key={s} title={SOURCE_LABEL[s]} value={s} icon={sourceIcon(s)} />
            ))}
          </List.Dropdown.Section>
          {projects.length > 0 && (
            <List.Dropdown.Section title="Project">
              {projects.map((p) => (
                <List.Dropdown.Item key={p} title={shortPath(p)} value={`project:${p}`} icon={Icon.Folder} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
      throttle
    >
      {filteredSessions.map((session) => (
        <SessionItem
          key={`${session.source}:${session.id}`}
          meta={session}
          matchSnippet={session.matchSnippet}
          focusIndex={session.focusIndex}
          query={searchText}
        />
      ))}
    </List>
  );
}

function SessionItem({
  meta,
  matchSnippet,
  focusIndex,
  query,
}: {
  meta: SessionMeta;
  matchSnippet?: string;
  focusIndex?: number;
  query: string;
}) {
  const detailQuery = matchSnippet ? query : undefined;

  return (
    <List.Item
      icon={sourceIcon(meta.source)}
      title={meta.title}
      subtitle={matchSnippet || meta.projectPath}
      accessories={[
        // During a content search the subtitle is the snippet, so surface the project separately.
        ...(matchSnippet && meta.projectPath ? [{ text: shortPath(meta.projectPath) }] : []),
        { text: SOURCE_LABEL[meta.source] },
        { text: formatRelativeTime(meta.timestamp) },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title={matchSnippet ? "View Matched Context" : "View Conversation"}
            icon={Icon.Eye}
            target={<SessionDetail meta={meta} query={detailQuery} focusIndex={focusIndex} />}
          />
          <SessionActions meta={meta} shortcuts />
        </ActionPanel>
      }
    />
  );
}
