import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { loadAllSessionMetas, loadSessionMessages, searchSessionContent } from "./parsers";
import { getResumeCommand, openInApp, openResumeInTerminal, sourceFamily } from "./terminal";
import {
  findMatchIndex,
  formatRelativeTime,
  formatSessionMarkdown,
  formatSessionPlainText,
  renderMessage,
} from "./format-session";
import { SOURCE_BADGE, SOURCE_LABEL } from "./source-display";
import type { SessionMeta, SessionSource } from "./types";

const SOURCE_ORDER: SessionSource[] = ["claude-cli", "claude-app", "codex-cli", "codex-app"];

const DETAIL_TRUNCATE_BYTES = 3000;

function SessionDetail({ meta, query }: { meta: SessionMeta; query?: string }) {
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

    const matchIdx = query ? findMatchIndex(messages, query) : -1;

    if (matchIdx >= 0) {
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
  }, [isLoading, meta, messages, query]);

  // Full untruncated markdown for "Copy Full Conversation"
  const fullMarkdown = useMemo(
    () => (messages && messages.length > 0 ? formatSessionMarkdown(meta, messages) : ""),
    [meta, messages],
  );
  const fullPlainText = useMemo(
    () => (messages && messages.length > 0 ? formatSessionPlainText(meta, messages) : ""),
    [meta, messages],
  );

  const isAppSource = meta.source === "claude-app" || meta.source === "codex-app";
  const appName = sourceFamily(meta.source) === "claude" ? "Claude" : "Codex";

  const openInAppAction = (
    <Action
      title={`Open in ${appName}`}
      icon={Icon.AppWindow}
      onAction={async () => {
        try {
          await openInApp(meta);
          await closeMainWindow();
        } catch (e) {
          showToast({ style: Toast.Style.Failure, title: `Failed to open ${appName}`, message: String(e) });
        }
      }}
    />
  );

  const openInTerminalAction = (
    <Action
      title="Resume in Terminal"
      icon={Icon.Terminal}
      onAction={async () => {
        try {
          await openResumeInTerminal(meta);
          await closeMainWindow();
        } catch (e) {
          showToast({ style: Toast.Style.Failure, title: "Failed to open terminal", message: String(e) });
        }
      }}
    />
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {isAppSource ? openInAppAction : openInTerminalAction}
          {isAppSource ? openInTerminalAction : openInAppAction}
          <Action.CopyToClipboard
            title="Copy Resume Command"
            content={getResumeCommand(meta)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Dangerous Resume Command"
            content={getResumeCommand(meta, undefined, { skipPermissions: true })}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Markdown"
            content={fullMarkdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
          <Action.CopyToClipboard
            title="Copy Plain Text"
            content={fullPlainText}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          {meta.projectPath ? <Action.ShowInFinder path={meta.projectPath} title="Open Project in Finder" /> : null}
          {/* eslint-disable @raycast/prefer-title-case */}
          <Action.CopyToClipboard
            content={meta.id}
            title="Copy Session ID"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {/* eslint-enable @raycast/prefer-title-case */}
          {meta.projectPath ? <Action.CopyToClipboard content={meta.projectPath} title="Copy Project Path" /> : null}
        </ActionPanel>
      }
    />
  );
}

// Cap the initial render at 200 items to keep Raycast's List responsive.
// Users with thousands of sessions can still find anything via the search bar — search
// scans the full meta list (titles) and full file contents (via ripgrep), not just the visible window.
const MAX_DISPLAY = 200;
const CONTENT_SEARCH_LIMIT = 100;

export default function SearchSessions() {
  const [searchText, setSearchText] = useState("");

  const { data: allMetas, isLoading: isLoadingMetas } = useCachedPromise(
    async () => {
      try {
        return await loadAllSessionMetas();
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load sessions", message: String(e) });
        return [];
      }
    },
    [],
    { keepPreviousData: true },
  );

  // Content search runs ripgrep asynchronously so the worker event loop stays free for IPC.
  // useCachedPromise dedupes by args (searchText) — typing "abc" doesn't fan out into stale runs.
  const { data: contentMatches } = useCachedPromise(
    async (q: string, hasMetas: boolean): Promise<Array<[string, string]>> => {
      if (!q.trim() || q.length < 2 || !hasMetas) return [];
      try {
        return await searchSessionContent(q, CONTENT_SEARCH_LIMIT);
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Content search unavailable", message: String(e) });
        return [];
      }
    },
    [searchText, !!allMetas],
  );

  // O(1) filePath -> meta lookup, used for merging content-search results into the list
  const metaByFilePath = useMemo(() => {
    const m = new Map<string, SessionMeta>();
    for (const meta of allMetas ?? []) m.set(meta.filePath, meta);
    return m;
  }, [allMetas]);

  const filteredSessions = useMemo(() => {
    if (!allMetas) return [];

    if (!searchText.trim()) {
      return allMetas.slice(0, MAX_DISPLAY).map((m) => ({ ...m, matchSnippet: undefined }));
    }

    const lowerQuery = searchText.toLowerCase();
    const seen = new Set<string>();
    const results: (SessionMeta & { matchSnippet?: string })[] = [];

    // Title matches first
    for (const meta of allMetas) {
      if (meta.title.toLowerCase().includes(lowerQuery)) {
        results.push({ ...meta, matchSnippet: undefined });
        seen.add(meta.id);
      }
    }

    // Then content matches (keyed by filePath, O(1) lookup via metaByFilePath)
    if (contentMatches) {
      for (const [filePath, snippet] of contentMatches) {
        const meta = metaByFilePath.get(filePath);
        if (meta && !seen.has(meta.id)) {
          results.push({ ...meta, matchSnippet: snippet });
          seen.add(meta.id);
        }
      }
    }

    return results;
  }, [allMetas, searchText, contentMatches, metaByFilePath]);

  const sectionsBySource = useMemo(() => {
    const grouped = new Map<SessionSource, (SessionMeta & { matchSnippet?: string })[]>();
    for (const session of filteredSessions) {
      const list = grouped.get(session.source) ?? [];
      list.push(session);
      grouped.set(session.source, list);
    }
    return grouped;
  }, [filteredSessions]);

  return (
    <List
      isLoading={isLoadingMetas}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search sessions by title or content..."
      throttle
    >
      {SOURCE_ORDER.map((source) => {
        const items = sectionsBySource.get(source);
        if (!items || items.length === 0) return null;
        return (
          <List.Section key={source} title={SOURCE_LABEL[source]} subtitle={`${items.length} sessions`}>
            {items.map((session) => (
              <SessionItem
                key={`${session.source}:${session.id}`}
                meta={session}
                matchSnippet={session.matchSnippet}
                query={searchText}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function SessionItem({ meta, matchSnippet, query }: { meta: SessionMeta; matchSnippet?: string; query: string }) {
  const icon = (() => {
    switch (meta.source) {
      case "claude-cli":
        return { source: Icon.Terminal, tintColor: Color.Orange };
      case "claude-app":
        return { source: Icon.AppWindow, tintColor: Color.Purple };
      case "codex-cli":
        return { source: Icon.Code, tintColor: Color.Green };
      case "codex-app":
        return { source: Icon.AppWindow, tintColor: Color.Blue };
    }
  })();

  const detailQuery = matchSnippet ? query : undefined;
  const isAppSource = meta.source === "claude-app" || meta.source === "codex-app";
  const appName = sourceFamily(meta.source) === "claude" ? "Claude" : "Codex";

  const openInAppAction = (
    <Action
      title={`Open in ${appName}`}
      icon={Icon.AppWindow}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={async () => {
        try {
          await openInApp(meta);
          await closeMainWindow();
          await popToRoot();
        } catch (e) {
          showToast({ style: Toast.Style.Failure, title: `Failed to open ${appName}`, message: String(e) });
        }
      }}
    />
  );

  const openInTerminalAction = (
    <Action
      title="Resume in Terminal"
      icon={Icon.Terminal}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      onAction={async () => {
        try {
          await openResumeInTerminal(meta);
          await closeMainWindow();
          await popToRoot();
        } catch (e) {
          showToast({ style: Toast.Style.Failure, title: "Failed to open terminal", message: String(e) });
        }
      }}
    />
  );

  return (
    <List.Item
      icon={icon}
      title={meta.title}
      subtitle={matchSnippet || meta.projectPath}
      accessories={[{ text: formatRelativeTime(meta.timestamp) }]}
      actions={
        <ActionPanel>
          <Action.Push
            title={matchSnippet ? "View Matched Context" : "View Conversation"}
            icon={Icon.Eye}
            target={<SessionDetail meta={meta} query={detailQuery} />}
          />
          {isAppSource ? openInAppAction : openInTerminalAction}
          {isAppSource ? openInTerminalAction : openInAppAction}
          <Action.CopyToClipboard
            title="Copy Resume Command"
            content={getResumeCommand(meta)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Dangerous Resume Command"
            content={getResumeCommand(meta, undefined, { skipPermissions: true })}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title="Copy Markdown"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={async () => {
              try {
                const messages = await loadSessionMessages(meta);
                if (messages.length === 0) {
                  showToast({ style: Toast.Style.Failure, title: "Empty session" });
                  return;
                }
                const md = formatSessionMarkdown(meta, messages);
                const { Clipboard } = await import("@raycast/api");
                await Clipboard.copy(md);
                showToast({ style: Toast.Style.Success, title: `Copied ${messages.length} messages` });
              } catch (e) {
                showToast({ style: Toast.Style.Failure, title: "Failed to copy", message: String(e) });
              }
            }}
          />
          <Action
            title="Copy Plain Text"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              try {
                const messages = await loadSessionMessages(meta);
                if (messages.length === 0) {
                  showToast({ style: Toast.Style.Failure, title: "Empty session" });
                  return;
                }
                const txt = formatSessionPlainText(meta, messages);
                const { Clipboard } = await import("@raycast/api");
                await Clipboard.copy(txt);
                showToast({ style: Toast.Style.Success, title: `Copied ${messages.length} messages` });
              } catch (e) {
                showToast({ style: Toast.Style.Failure, title: "Failed to copy", message: String(e) });
              }
            }}
          />
          {meta.projectPath ? <Action.ShowInFinder path={meta.projectPath} title="Open Project in Finder" /> : null}
          {/* eslint-disable @raycast/prefer-title-case */}
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={meta.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {/* eslint-enable @raycast/prefer-title-case */}
          {meta.projectPath ? <Action.CopyToClipboard title="Copy Project Path" content={meta.projectPath} /> : null}
        </ActionPanel>
      }
    />
  );
}
