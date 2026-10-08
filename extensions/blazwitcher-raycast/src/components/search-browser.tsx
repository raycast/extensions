import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { captureChromeContext } from "../browser/chrome";
import { BrowserActions } from "./browser-actions";
import { useShortcuts } from "../hooks/use-shortcuts";
import type { CapturedContext } from "../actions";
import { parseHistoryLimit } from "../browser/history";
import { useBrowserSearch } from "../hooks/use-browser-search";
import { useFavicons } from "../hooks/use-favicons";
import { usePagePreview } from "../hooks/use-page-preview";
import { ResultDetail } from "./result-detail";
import { BrowserResultItem } from "./browser-result-item";
import { raycastShortcut } from "../shortcuts";
import { parseQuery, switchScope } from "../search/query";
import { createResultSections } from "../search/result-sections";
import {
  sourceNames,
  type Scope,
  type SearchResult,
  type Source,
} from "../types";

const scopeNames: Record<Scope, string> = { all: "全部来源", ...sourceNames };

export default function SearchBrowser() {
  const [captured] = useState<CapturedContext>(() =>
    captureChromeContext().then(
      (context) => ({ context }),
      (error: unknown) => ({ error }),
    ),
  );
  const preferences = getPreferenceValues<{
    historyLimit?: string;
    includeIncognito?: boolean;
    sourceShortcuts?: string;
    startupPreview?: boolean;
  }>();
  const options = useMemo(
    () => ({
      scope: "all" as const,
      historyLimit: parseHistoryLimit(preferences.historyLimit),
      includeIncognito: preferences.includeIncognito ?? false,
      startupPreview: preferences.startupPreview ?? true,
    }),
    [
      preferences.historyLimit,
      preferences.includeIncognito,
      preferences.startupPreview,
    ],
  );
  const shortcuts = useShortcuts(preferences.sourceShortcuts);
  const [input, setInput] = useState("");
  const [selectedScope, setSelectedScope] = useState<Scope>("all");
  const [selectedId, setSelectedId] = useState<string | null>();
  const [showDetail, setShowDetail] = useState(false);
  const query = parseQuery(input, selectedScope);
  const state = useBrowserSearch(options, query.text, query.scope);
  const { page, snapshot } = state;
  const activeEntry =
    page?.results.find(({ entry }) => entry.id === selectedId)?.entry ??
    page?.results[0]?.entry;
  const preview = usePagePreview(activeEntry, page?.version ?? -1, showDetail);
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
        (warning) => `${sourceNames[source as Source]}：${warning}`,
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
      if (!page || !result) throw new Error("结果已更新，请重新选择。");
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
      >
        <Action
          title={showDetail ? "隐藏详情" : "显示详情"}
          icon={Icon.Sidebar}
          shortcut={raycastShortcut(shortcuts.bindings.toggleDetail)}
          onAction={() => setShowDetail((value) => !value)}
        />
        {showDetail && result?.entry.source === "tab" && (
          <Action
            title="刷新预览"
            icon={Icon.ArrowClockwise}
            onAction={preview.refresh}
          />
        )}
        <ActionPanel.Submenu title="切换 Chrome 配置" icon={Icon.Person}>
          <Action
            title="全部配置"
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
          title="清除启动缓存"
          icon={Icon.Trash}
          onAction={async () => {
            const cleared = state.service.clearPreviewCache();
            await showToast({
              style: cleared ? Toast.Style.Success : Toast.Style.Failure,
              title: cleared ? "已清除启动缓存" : "清除启动缓存失败，请重试",
            });
          }}
        />
      </BrowserActions>
    );
  };
  const activeId = activeEntry?.id;
  const sections = page ? createResultSections(page.results, query.text) : [];
  const resultSummary = page
    ? `${page.total.toLocaleString()} 个结果${cached ? " · 缓存预览" : ""}`
    : "正在搜索…";
  return (
    <List
      isShowingDetail={showDetail}
      filtering={false}
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
      selectedItemId={activeId}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="搜索标签页、书签和历史记录，支持拼音与首字母…"
      navigationTitle="Blazwitcher · 搜索浏览器"
      searchBarAccessory={
        <List.Dropdown
          tooltip="搜索来源"
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
              ? `${resultSummary}${cached ? " · 正在读取完整数据" : ""}`
              : undefined
          }
        >
          {section.results.map((result) => (
            <BrowserResultItem
              key={result.entry.id}
              entry={result.entry}
              favicon={favicons?.get(result.entry.id)}
              showDetail={showDetail}
              detail={
                showDetail && result.entry.id === activeId ? (
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
        <List.Section title="来源状态">
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
        title={busy ? "正在读取浏览器数据…" : "没有找到匹配结果"}
        description="试试中文、完整拼音、首字母或网址。"
        icon={Icon.MagnifyingGlass}
        actions={actions()}
      />
    </List>
  );
}
