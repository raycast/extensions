import { t } from "./i18n.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { resolveLaunchUrl } from "./bookmark-utils.ts";
import { failureMessage } from "./bookmark-form.tsx";
import type { Bookmark, LibraryState, Mutation, Visit } from "./model.ts";
import { commit } from "./repository.ts";
import {
  loadConfiguredLibrary,
  refreshVisibleLibrary,
} from "./library-source.ts";
import ManageData from "./manage-data.tsx";
import SharedJsonForm from "./shared-json.tsx";
import { ExportForm } from "./manage-data/export-form.tsx";
import {
  disconnectSharedSource,
  setSharedJsonStorage,
} from "./shared-json-storage.ts";
import { inScope, matches } from "./search/query.ts";
import {
  BookmarkGridItem,
  BookmarkListItem,
} from "./search/bookmark-grid-item.tsx";
import { ScopeDropdown } from "./search/scope-dropdown.tsx";
import { SearchEmptyView } from "./search/empty-view.tsx";

setSharedJsonStorage(LocalStorage);

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [root, setRoot] = useState<string>();
  const [state, setState] = useState<LibraryState>();
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const toggleView = () =>
    setView((current) => (current === "list" ? "grid" : "list"));
  const sharedError = useRef("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        root: directory,
        state: library,
        sourceError,
      } = await loadConfiguredLibrary(preferences, environment.supportPath);
      setRoot(directory);
      setState(library);
      setFailure(sourceError);
      sharedError.current = "";
      if (library.status === "conflicted")
        await showToast({
          style: Toast.Style.Failure,
          title: t("存在未解决冲突，本次只读"),
          message: t("请在设置与数据中解决冲突后才能写入"),
        });
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsLoading(false);
  }, [preferences.dataDirectory, preferences.dataFile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!root || !state || state.status !== "ready") return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const next = await refreshVisibleLibrary(root, state);
          if (next !== state) setState(next);
          if (sharedError.current) {
            sharedError.current = "";
            setFailure(undefined);
          }
        } catch (error) {
          const message = failureMessage(error);
          if (sharedError.current !== message) {
            sharedError.current = message;
            setFailure(t`共享 JSON 同步已暂停：${message}`);
          }
        }
      })();
    }, 1500);
    return () => clearInterval(timer);
  }, [root, state]);

  async function applyCommit(
    mutations: Mutation[],
    visits: Visit[] | undefined,
    title: string,
    message?: string,
  ) {
    if (!root || !state) return;
    try {
      const result = await commit(root, {
        mutations,
        visits,
        expectedHeads: state.heads,
      });
      setState(result.state);
      await showToast({
        style: result.sharedSyncPaused
          ? Toast.Style.Failure
          : Toast.Style.Success,
        title: result.sharedSyncPaused ? t("本地已保存，同步暂停") : title,
        message: result.warning ?? message,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未写入"),
        message: failureMessage(error),
      });
    }
  }

  async function openBookmark(
    bookmark: Bookmark,
    values?: Record<string, string>,
  ): Promise<boolean> {
    if (!root || !state) return false;
    let url: string;
    try {
      url = resolveLaunchUrl(bookmark.url, values);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("无法打开"),
        message: failureMessage(error),
      });
      return false;
    }
    try {
      await open(url);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t("无法打开链接"),
        message: bookmark.title,
      });
      return false;
    }
    try {
      const result = await commit(root, {
        mutations: [],
        visits: [{ bookmarkId: bookmark.id, usedAt: Date.now() }],
        expectedHeads: state.heads,
      });
      setState(result.state);
      if (result.warning)
        await showToast({
          style: Toast.Style.Success,
          title: t("已打开并记录访问，请注意"),
          message: result.warning,
        });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("已打开，但未能记录访问"),
        message: failureMessage(error),
      });
    }
    return true;
  }

  const visible = useMemo(() => {
    if (!state) return { items: [] as Bookmark[], fallback: false };
    const matched = state.bookmarks
      .filter((bookmark) => inScope(bookmark, scope))
      .filter((bookmark) => matches(bookmark, query));
    if (query.trim() && !matched.length && scope !== "trash") {
      const fallback = state.bookmarks.filter(
        (bookmark) =>
          inScope(bookmark, scope) && bookmark.allowUniversal === true,
      );
      if (fallback.length) return { items: fallback, fallback: true };
    }
    const sorted = [...matched].sort(
      (a, b) =>
        (b.lastUsed ?? 0) - (a.lastUsed ?? 0) || a.title.localeCompare(b.title),
    );
    return { items: sorted, fallback: false };
  }, [state, scope, query]);

  if (failure) {
    return (
      <Detail
        markdown={t`# 无法读取本地库\n\n${failure}\n\n请在扩展设置中确认“Shared Data Folder”指向包含 bookmarks.json 与 assets/icons 的文件夹。`}
        actions={
          <ActionPanel>
            <Action
              title={t("重新加载")}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={load}
            />
            {root && state && (
              <>
                <Action.Push
                  title={t("导出数据文件夹")}
                  target={<ExportForm root={root} />}
                />
                <Action.Push
                  title={t("备份本地事件库（恢复用）")}
                  target={<ExportForm root={root} recovery />}
                />
                <Action.Push
                  title={t("共享数据文件夹")}
                  target={
                    <SharedJsonForm
                      root={root}
                      state={state}
                      onSaved={(next) => {
                        setState(next);
                        void load();
                      }}
                    />
                  }
                />
                <Action
                  title={t("断开并保留本地")}
                  onAction={async () => {
                    await disconnectSharedSource();
                    await load();
                  }}
                />
                <Action.Push
                  title={t("设置与数据")}
                  target={
                    <ManageData
                      onSaved={setState}
                      onClose={() => {
                        void load();
                      }}
                    />
                  }
                />
              </>
            )}
            <Action
              title={t("打开扩展设置")}
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!root || !state) {
    return (
      <Grid isLoading searchText={query} onSearchTextChange={setQuery}>
        <Grid.EmptyView title={t("正在读取本地库")} />
      </Grid>
    );
  }

  if (state.status === "blocked") {
    const issues = state.issues
      .map(
        (issue) =>
          `- \`${issue.code}\` ${issue.message}${issue.file ? `（${issue.file}）` : ""}`,
      )
      .join("\n");
    return (
      <Detail
        markdown={t`# 本地库已暂停写入\n\n检测到不可读或不安全的数据，不会以空库覆盖本地文件，也不会展示未经校验的数据。\n\n${issues}\n\n数据目录：\`${root}\``}
        actions={
          <ActionPanel>
            <Action.Push
              title={t("备份本地事件库（恢复用）")}
              target={<ExportForm root={root} recovery />}
            />
            <Action
              title={t("重新加载")}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={load}
            />
            <Action
              title={t("打开扩展设置")}
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const itemProps = {
    root,
    state,
    onSaved: setState,
    onReload: load,
    openBookmark,
    applyCommit,
    onToggleView: toggleView,
  };
  const Item = view === "list" ? BookmarkListItem : BookmarkGridItem;
  const items = visible.items.map((bookmark) => (
    <Item key={bookmark.id} bookmark={bookmark} {...itemProps} />
  ));
  const Root = view === "list" ? List : Grid;
  const Section = view === "list" ? List.Section : Grid.Section;
  const empty = !items.length && (
    <SearchEmptyView
      root={root}
      state={state}
      query={query}
      scope={scope}
      onSaved={setState}
      view={view}
    />
  );

  return (
    <Root
      {...(view === "grid" ? { columns: 5 } : {})}
      isLoading={isLoading}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={t("搜索标题、网址、描述或标签")}
      searchBarAccessory={
        <ScopeDropdown
          catalog={state.catalog}
          scope={scope}
          onChange={setScope}
          view={view}
        />
      }
    >
      {visible.fallback ? (
        <Section title={t("万能匹配回退")}>{items}</Section>
      ) : (
        items
      )}
      {empty}
    </Root>
  );
}
