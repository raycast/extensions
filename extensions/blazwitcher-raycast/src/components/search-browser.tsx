import {
  Action,
  ActionPanel,
  BrowserExtension,
  Color,
  Icon,
  List,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { captureChromeContext } from "../browser/chrome";
import { BrowserActions } from "./browser-actions";
import { useShortcuts } from "../hooks/use-shortcuts";
import type { CapturedContext } from "../actions";
import { parseHistoryDays, parseHistoryLimit } from "../browser/history";
import { useBrowserSearch } from "../hooks/use-browser-search";
import { useFavicons } from "../hooks/use-favicons";
import { usePagePreview } from "../hooks/use-page-preview";
import { ResultDetail } from "./result-detail";
import { BrowserResultItem } from "./browser-result-item";
import { raycastShortcut } from "../shortcuts";
import { parseQuery, switchScope } from "../search/query";
import { createResultSections } from "../search/result-sections";
import {
  parseBookmarkDisplayCount,
  parseHistoryDisplayCount,
  parseTopSuggestionsCount,
} from "../search/config";
import {
  sourceNames,
  type Scope,
  type SearchResult,
  type Source,
} from "../types";

const scopeNames: Record<Scope, string> = {
  all: "All Sources",
  tab: "Open Tabs",
  bookmark: "Bookmarks",
  history: "History",
};

export default function SearchBrowser() {
  const [captured] = useState<CapturedContext>(() =>
    captureChromeContext().then(
      (context) => ({ context }),
      (error: unknown) => ({ error }),
    ),
  );
  const preferences = getPreferenceValues<Preferences>();
  const options = useMemo(
    () => ({
      scope: "all" as const,
      historyLimit: parseHistoryLimit(preferences.historyLimit),
      includeIncognito: preferences.includeIncognito ?? false,
      startupPreview: preferences.startupPreview ?? true,
      searchStrategy:
        preferences.searchStrategy === "full-url"
          ? ("full-url" as const)
          : ("chrome" as const),
      historyDays: parseHistoryDays(preferences.historyDays),
      historyDisplayCount: parseHistoryDisplayCount(
        preferences.historyDisplayCount,
      ),
      bookmarkDisplayCount: parseBookmarkDisplayCount(
        preferences.bookmarkDisplayCount,
      ),
      topSuggestionsCount: parseTopSuggestionsCount(
        preferences.topSuggestionsCount,
      ),
      enableConsecutiveSearch: preferences.enableConsecutiveSearch ?? false,
    }),
    [
      preferences.historyLimit,
      preferences.includeIncognito,
      preferences.startupPreview,
      preferences.searchStrategy,
      preferences.historyDays,
      preferences.historyDisplayCount,
      preferences.bookmarkDisplayCount,
      preferences.topSuggestionsCount,
      preferences.enableConsecutiveSearch,
    ],
  );
  const shortcuts = useShortcuts();
  const [input, setInput] = useState("");
  const [selectedScope, setSelectedScope] = useState<Scope>("all");
  const [selectedId, setSelectedId] = useState<string | null>();
  const [showDetail, setShowDetail] = useState(false);
  // 不注册不可用能力的动作和快捷键，避免进入只有安装提示的详情栏。
  const detailAvailable = environment.canAccess(BrowserExtension);
  const detailVisible = detailAvailable && showDetail;
  const query = parseQuery(input, selectedScope);
  const state = useBrowserSearch(options, query.text, query.scope);
  const { page, snapshot } = state;
  const activeEntry =
    page?.results.find(({ entry }) => entry.id === selectedId)?.entry ??
    page?.results[0]?.entry;
  const preview = usePagePreview(
    activeEntry,
    page?.version ?? -1,
    detailVisible,
  );
  const favicons = useFavicons(page?.results, page?.version ?? -1);
  const cached = Object.entries(snapshot?.states ?? {}).some(
    ([source, state]) =>
      state.cached && (query.scope === "all" || query.scope === source),
  );
  const busy =
    state.searching ||
    Object.values(snapshot?.states ?? {}).some((source) => source.loading);
  const warnings = Object.entries(snapshot?.states ?? {}).flatMap(
    ([source, status]) =>
      status.warnings.map(
        (warning) => `${sourceNames[source as Source]}: ${warning}`,
      ),
  );
  if (state.error) warnings.push(state.error);
  if (shortcuts.error) warnings.push(shortcuts.error);
  const selectScope = (scope: Scope) => {
    const next = switchScope(input, scope);
    const nextQuery = parseQuery(next.input, next.scope);
    if (nextQuery.text !== query.text || nextQuery.scope !== query.scope) {
      state.cancel();
      setSelectedId(undefined);
    }
    setInput(next.input);
    setSelectedScope(next.scope);
  };

  const actions = (result?: SearchResult) => {
    const resolve = () => {
      if (!page || !result)
        throw new Error("Results changed. Select a result again.");
      return state.service.entry({
        id: result.entry.id,
        requestId: page.requestId,
        version: page.version,
      });
    };
    return (
      <BrowserActions
        entry={result?.entry}
        resolve={resolve}
        captured={captured}
        shortcuts={shortcuts}
        scope={query.scope}
        selectScope={selectScope}
        previewActions={
          detailAvailable && (
            <>
              <Action
                title={detailVisible ? "Collapse Preview" : "Expand Preview"}
                icon={Icon.Sidebar}
                shortcut={raycastShortcut(shortcuts.bindings.toggleDetail)}
                onAction={() => setShowDetail((value) => !value)}
              />
              {detailVisible && result?.entry.source === "tab" && (
                <Action
                  title="Refresh Preview"
                  icon={Icon.ArrowClockwise}
                  onAction={preview.refresh}
                />
              )}
            </>
          )
        }
      >
        <ActionPanel.Submenu title="Switch Chrome Profile" icon={Icon.Person}>
          <Action
            title="All Profiles"
            onAction={() => state.selectProfile("all")}
          />
          {snapshot?.profiles.map((profile) => (
            <Action
              key={profile.id}
              title={profile.name}
              icon={
                profile.id === snapshot.profileId ? Icon.Checkmark : Icon.Person
              }
              onAction={() => state.selectProfile(profile.id)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Clear Startup Cache"
          icon={Icon.Trash}
          onAction={async () => {
            const cleared = state.service.clearPreviewCache();
            await showToast({
              style: cleared ? Toast.Style.Success : Toast.Style.Failure,
              title: cleared
                ? "Startup Cache Cleared"
                : "Could Not Clear Startup Cache",
            });
          }}
        />
      </BrowserActions>
    );
  };
  const activeId = activeEntry?.id;
  const sections = page
    ? createResultSections(
        page.results,
        query.text,
        options.topSuggestionsCount,
      )
    : [];
  const resultSummary = page
    ? `${page.total.toLocaleString("en-US")} ${page.total === 1 ? "result" : "results"}${cached ? " · Cached preview" : ""}`
    : "Searching…";
  return (
    <List
      isShowingDetail={detailVisible}
      filtering={false}
      throttle={true}
      isLoading={busy}
      searchText={input}
      onSearchTextChange={(text) => {
        if (text === input) return;
        const next = parseQuery(text, selectedScope);
        if (next.text !== query.text || next.scope !== query.scope)
          state.cancel();
        setSelectedId(undefined);
        setInput(text);
      }}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search tabs, bookmarks, and history with Pinyin…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Sources"
          value={query.scope}
          onChange={(value) => selectScope(value as Scope)}
        >
          {Object.entries(scopeNames).map(([value, title]) => (
            <List.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </List.Dropdown>
      }
      pagination={{
        pageSize: 50,
        hasMore: Boolean(page && page.results.length < page.total),
        onLoadMore: state.loadMore,
      }}
    >
      {sections.map((section, index) => (
        <List.Section
          key={section.key}
          title={section.title}
          subtitle={
            index === 0
              ? `${resultSummary}${cached ? " · Loading full data" : ""}`
              : undefined
          }
        >
          {section.results.map((result) => (
            <BrowserResultItem
              key={result.entry.id}
              entry={result.entry}
              favicon={favicons?.get(result.entry.id)}
              showDetail={detailVisible}
              detail={
                detailVisible && result.entry.id === activeId ? (
                  <ResultDetail
                    entry={result.entry}
                    preview={preview}
                    isLoading={preview.isLoading}
                  />
                ) : undefined
              }
              actions={actions(result)}
            />
          ))}
        </List.Section>
      ))}
      {warnings.length > 0 && (
        <List.Section title="Source Status">
          {warnings.map((warning) => (
            <List.Item
              key={warning}
              title={warning}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              actions={actions()}
            />
          ))}
        </List.Section>
      )}
      <List.EmptyView
        title={busy ? "Loading browser data…" : "No Matching Results"}
        description="Try Chinese, full Pinyin, initials, or a URL."
        icon={Icon.MagnifyingGlass}
        actions={actions()}
      />
    </List>
  );
}
