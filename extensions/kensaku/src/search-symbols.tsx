import path from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, type LaunchProps, List } from "@raycast/api";
import { FileActionSection, ServerActionSection } from "./components/CommonActions";
import { buildSafeCodeBlock, formatShortPath, getCodeFenceLanguage, inlineCode, modShortcut } from "./lib/format";
import { findSymbols, getErrorDescription, isAbortError, readSnippet } from "./lib/kensaku";
import type { SnippetResponse, SymbolHit, SymbolSearchResponse } from "./lib/types";
import { useExtensionPreferences } from "./lib/usePreferences";

type SymbolLanguageFilter = "" | "rust" | "typescript" | "javascript" | "python";

const DEBOUNCE_MS = 150;
const SNIPPET_DEBOUNCE_MS = 80;

function getSymbolKindIcon(kind: string): Icon {
  const normalized = kind.toLowerCase();
  if (normalized.includes("fn") || normalized.includes("func") || normalized.includes("method")) {
    return Icon.Code;
  }
  if (
    normalized.includes("struct") ||
    normalized.includes("class") ||
    normalized.includes("interface") ||
    normalized.includes("trait") ||
    normalized.includes("enum")
  ) {
    return Icon.Box;
  }
  return Icon.Tag;
}

function getSymbolItemId(hit: SymbolHit, index: number): string {
  return `${hit.path}:${hit.line_start}:${hit.name}:${index}`;
}

export default function SearchSymbolsCommand(props: LaunchProps) {
  const prefs = useExtensionPreferences();
  const pageSize = useMemo(() => {
    const parsed = Number(prefs.defaultLimit);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 1), 50) : 25;
  }, [prefs.defaultLimit]);

  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [language, setLanguage] = useState<SymbolLanguageFilter>("");
  const [symbols, setSymbols] = useState<SymbolHit[]>([]);
  const [meta, setMeta] = useState<Omit<SymbolSearchResponse, "symbols"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const snippetCacheRef = useRef<Map<string, { snippet?: SnippetResponse; error?: string }>>(new Map());
  const [, setSnippetTick] = useState(0);

  const triggerRefresh = useCallback(() => {
    snippetCacheRef.current.clear();
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setSymbols([]);
      setMeta(null);
      setErrorState(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorState(null);

    const timer = setTimeout(async () => {
      try {
        const res = await findSymbols(
          {
            query: trimmed,
            language: language || undefined,
            pageSize,
          },
          prefs,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        const { symbols: hits, ...rest } = res;
        setSymbols(hits);
        setMeta(rest);
        setErrorState(null);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setSymbols([]);
        setMeta(null);
        setErrorState(getErrorDescription(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, language, pageSize, refreshNonce, prefs]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const hitIndex = symbols.findIndex((hit, idx) => getSymbolItemId(hit, idx) === selectedId);
    if (hitIndex < 0) {
      return;
    }
    const hit = symbols[hitIndex];
    const cacheKey = `${hit.path}\0${hit.name}`;
    if (snippetCacheRef.current.has(cacheKey)) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const snippet = await readSnippet(
          {
            path: hit.path,
            query: hit.name,
            maxTokens: 200,
          },
          prefs,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        if (snippetCacheRef.current.size > 100) {
          snippetCacheRef.current.clear();
        }
        snippetCacheRef.current.set(cacheKey, { snippet });
        setSnippetTick((t) => t + 1);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        snippetCacheRef.current.set(cacheKey, { error: message });
        setSnippetTick((t) => t + 1);
      }
    }, SNIPPET_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedId, symbols, prefs]);

  const emptyView = useMemo(() => {
    if (errorState) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorState.title}
          description={errorState.message}
          actions={
            <ActionPanel>
              <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    if (!searchText.trim()) {
      return (
        <List.EmptyView
          icon={Icon.Code}
          title="Search Code Symbols"
          description="Type a function, struct, class, trait, or interface name across Rust, TypeScript, JavaScript, and Python."
          actions={
            <ActionPanel>
              <ServerActionSection prefs={prefs} onServerRestarted={triggerRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    if (!isLoading) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Symbols Found"
          description="No matching symbol definitions were found in indexed source files."
          actions={
            <ActionPanel>
              <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return undefined;
  }, [errorState, searchText, isLoading, prefs, triggerRefresh]);

  const sectionSubtitle = meta ? `${symbols.length} of ${meta.total} (${meta.files_parsed} files parsed)` : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={symbols.length > 0}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Find symbol definitions (e.g. IndexerManager, searchFiles, handle_request)..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Language Filter"
          value={language}
          onChange={(value) => setLanguage(value as SymbolLanguageFilter)}
        >
          <List.Dropdown.Item title="All Languages" value="" />
          <List.Dropdown.Item title="Rust" value="rust" />
          <List.Dropdown.Item title="TypeScript" value="typescript" />
          <List.Dropdown.Item title="JavaScript" value="javascript" />
          <List.Dropdown.Item title="Python" value="python" />
        </List.Dropdown>
      }
    >
      {symbols.length === 0 ? (
        emptyView
      ) : (
        <List.Section title="Symbols" subtitle={sectionSubtitle}>
          {symbols.map((hit, idx) => {
            const id = getSymbolItemId(hit, idx);
            const location = `${hit.path}:${hit.line_start}`;
            const lang = getCodeFenceLanguage(hit.path);
            const cacheEntry = snippetCacheRef.current.get(`${hit.path}\0${hit.name}`);

            const markdownLines = [
              `### ${hit.name}`,
              "",
              inlineCode(`${formatShortPath(hit.path)}:${hit.line_start}`),
              "",
              "**Signature**",
              "",
              buildSafeCodeBlock(hit.signature || hit.name, lang),
            ];

            if (cacheEntry?.snippet?.text?.trimEnd()) {
              markdownLines.push(
                "",
                `**Context (Lines ${cacheEntry.snippet.line_start}–${cacheEntry.snippet.line_end})**`,
                "",
                buildSafeCodeBlock(cacheEntry.snippet.text.trimEnd(), lang),
              );
            }

            return (
              <List.Item
                key={id}
                id={id}
                icon={getSymbolKindIcon(hit.kind)}
                title={hit.name}
                subtitle={`${path.basename(hit.path)}:${hit.line_start}`}
                accessories={[{ tag: { value: hit.kind, color: Color.Blue } }]}
                detail={
                  <List.Item.Detail
                    markdown={markdownLines.join("\n")}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Kind">
                          <List.Item.Detail.Metadata.TagList.Item text={hit.kind} color={Color.Blue} />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Lines" text={`${hit.line_start}–${hit.line_end}`} />
                        <List.Item.Detail.Metadata.Label title="File" text={formatShortPath(hit.path)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <FileActionSection filePath={hit.path} />
                    <ActionPanel.Section title="Symbol">
                      <Action.CopyToClipboard
                        title="Copy Location"
                        content={location}
                        shortcut={modShortcut(["shift"], "l")}
                      />
                      <Action.CopyToClipboard
                        title="Copy Signature"
                        content={hit.signature || hit.name}
                        shortcut={modShortcut(["shift"], "c")}
                      />
                    </ActionPanel.Section>
                    <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
