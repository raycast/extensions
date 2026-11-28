import path from "node:path";
import { useCallback, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, type LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FileActionSection, ServerActionSection } from "./components/CommonActions";
import { buildSafeCodeBlock, formatShortPath, getCodeFenceLanguage, inlineCode, modShortcut } from "./lib/format";
import { findSymbols, getErrorDescription, readSnippet } from "./lib/kensaku";
import type { ExtensionPreferences, SymbolHit } from "./lib/types";

type SymbolLanguageFilter = "" | "rust" | "typescript" | "javascript" | "python";

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
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const pageSize = useMemo(() => {
    const parsed = Number(prefs.defaultLimit);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 1), 50) : 25;
  }, [prefs.defaultLimit]);

  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [language, setLanguage] = useState<SymbolLanguageFilter>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const symbolsAbortable = useRef<AbortController | undefined>(undefined);
  const snippetAbortable = useRef<AbortController | undefined>(undefined);

  const trimmedQuery = searchText.trim();

  const {
    data: symbolResponse,
    error: symbolError,
    isLoading,
    revalidate,
  } = usePromise(
    async (query: string, lang: SymbolLanguageFilter, limit: number) =>
      findSymbols(
        {
          query,
          language: lang || undefined,
          pageSize: limit,
        },
        getPreferenceValues<ExtensionPreferences>(),
        symbolsAbortable.current?.signal,
      ),
    [trimmedQuery, language, pageSize],
    {
      execute: Boolean(trimmedQuery),
      abortable: symbolsAbortable,
      failureToastOptions: { title: "Failed to Search Code Symbols" },
    },
  );

  const symbols = useMemo(() => (trimmedQuery ? (symbolResponse?.symbols ?? []) : []), [trimmedQuery, symbolResponse]);

  const selectedHit = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return symbols.find((hit, idx) => getSymbolItemId(hit, idx) === selectedId) ?? null;
  }, [symbols, selectedId]);

  const { data: activeSnippet, revalidate: revalidateSnippet } = usePromise(
    async (filePath: string, symbolName: string) =>
      readSnippet(
        {
          path: filePath,
          query: symbolName,
          maxTokens: 200,
        },
        getPreferenceValues<ExtensionPreferences>(),
        snippetAbortable.current?.signal,
      ),
    [selectedHit?.path ?? "", selectedHit?.name ?? ""],
    {
      execute: Boolean(selectedHit),
      abortable: snippetAbortable,
      onError: () => {
        // Degrade gracefully to signature-only preview when snippet reads fail.
      },
    },
  );

  const handleRefresh = useCallback(() => {
    void revalidate();
    if (selectedHit) {
      void revalidateSnippet();
    }
  }, [revalidate, revalidateSnippet, selectedHit]);

  const errorInfo = trimmedQuery && symbolError ? getErrorDescription(symbolError) : null;

  const emptyView = useMemo(() => {
    if (errorInfo) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorInfo.title}
          description={errorInfo.message}
          actions={
            <ActionPanel>
              <ServerActionSection onRefresh={handleRefresh} onServerRestarted={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    if (!trimmedQuery) {
      return (
        <List.EmptyView
          icon={Icon.Code}
          title="Search Code Symbols"
          description="Type a function, struct, class, trait, or interface name across Rust, TypeScript, JavaScript, and Python."
          actions={
            <ActionPanel>
              <ServerActionSection onServerRestarted={handleRefresh} />
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
              <ServerActionSection onRefresh={handleRefresh} onServerRestarted={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return undefined;
  }, [errorInfo, trimmedQuery, isLoading, handleRefresh]);

  const sectionSubtitle =
    trimmedQuery && symbolResponse && symbols.length > 0
      ? `${symbols.length} of ${symbolResponse.total} (${symbolResponse.files_parsed} files parsed)`
      : undefined;

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
            const snippet = activeSnippet?.path === hit.path ? activeSnippet : null;

            const markdownLines = [
              `### ${hit.name}`,
              "",
              inlineCode(`${formatShortPath(hit.path)}:${hit.line_start}`),
              "",
              "**Signature**",
              "",
              buildSafeCodeBlock(hit.signature || hit.name, lang),
            ];

            if (snippet?.text?.trimEnd()) {
              markdownLines.push(
                "",
                `**Context (Lines ${snippet.line_start}–${snippet.line_end})**`,
                "",
                buildSafeCodeBlock(snippet.text.trimEnd(), lang),
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
                    <ServerActionSection onRefresh={handleRefresh} onServerRestarted={handleRefresh} />
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
