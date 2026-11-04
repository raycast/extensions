import { statusLabel } from "./core/format";
import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { hostTag, rowTime } from "./core/format";
import { isClaudeCloudOnly } from "./core/claude-desktop";
import { scanHistory } from "./core/history";
import { Translator } from "./core/messages";
import { projectName } from "./core/paths";
import { mergeSessions } from "./core/merge";
import { filterSessions, SessionFilter } from "./core/status";
import { ContentMatches, IndexProgress, searchSessions, SessionSearchIndex } from "./core/search";
import { Config, Session } from "./core/types";
import { agentIcon, statusDot } from "./components/icons";
import { SessionDetail } from "./components/SessionDetail";
import { locale } from "./lib/env";
import { allSessions, jumpBack, store, refreshSessionTitles } from "./lib/sessions";
import { subscribeCurrent } from "./lib/subscribe-current";
import { ConnectionActions } from "./components/ConnectionActions";

const key = (s: { agent: string; sessionId: string }) => `${s.agent}:${s.sessionId}`;

export default function AllSessions() {
  const { t, config } = locale();
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contentMatches, setContentMatches] = useState<ContentMatches>({});
  const [searching, setSearching] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState<IndexProgress>({ completed: 0, total: 0, updated: 0, failed: 0 });
  const [indexRevision, setIndexRevision] = useState(0);
  const index = useMemo(() => new SessionSearchIndex(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    async () => {
      const [rows, history] = await Promise.all([
        allSessions(Number.MAX_SAFE_INTEGER),
        Promise.resolve().then(() => scanHistory({ limit: Number.MAX_SAFE_INTEGER, includeUntitled: true })),
      ]);
      return refreshSessionTitles(mergeSessions(rows, history));
    },
    [],
    { keepPreviousData: true },
  );

  useEffect(() => {
    const timer = setInterval(() => {
      void revalidate();
    }, 5000);
    return () => clearInterval(timer);
  }, [revalidate]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 180);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!config.contentSearchEnabled || !data) {
      setIndexing(false);
      setIndexProgress({ completed: 0, total: 0, updated: 0, failed: 0 });
      return;
    }
    const controller = new AbortController();
    setIndexing(true);
    void index
      .update(data, (progress) => !controller.signal.aborted && setIndexProgress(progress), controller.signal)
      .then((progress) => {
        if (controller.signal.aborted) return;
        setIndexProgress(progress);
        setIndexing(false);
        setIndexRevision((revision) => revision + 1);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setIndexing(false);
        setIndexProgress((progress) => ({ ...progress, failed: Math.max(1, progress.failed) }));
      });
    return () => controller.abort();
  }, [data, index, config.contentSearchEnabled]);

  useEffect(() => {
    let current = true;
    if (!config.contentSearchEnabled || !debouncedSearch.trim()) {
      setContentMatches({});
      setSearching(false);
      return;
    }
    setSearching(true);
    void index
      .search(debouncedSearch)
      .then((matches) => {
        if (current) setContentMatches(matches);
      })
      .catch(() => {
        if (!current) return;
        setContentMatches({});
        setIndexProgress((progress) => ({ ...progress, failed: Math.max(1, progress.failed) }));
      })
      .finally(() => current && setSearching(false));
    return () => {
      current = false;
    };
  }, [debouncedSearch, index, indexRevision, config.contentSearchEnabled]);

  const sessions = searchSessions(filterSessions(data ?? [], filter), search, config.contentSearchEnabled ? contentMatches : {}).filter(
    (s) => search.trim() || s.title || s.summary || s.subscribed || s.status !== "idle",
  );
  const hasSearch = search.trim().length > 0;

  async function toggle(s: Session) {
    const next = !s.subscribed;
    try {
      await mutate(next ? store.subscribeEntry(s) : store.setSubscribed(s.agent, s.sessionId, false), {
        optimisticUpdate: (list) =>
          (list ?? []).map((x) => (key(x) === key(s) ? { ...x, subscribed: next, handledAt: next ? null : x.handledAt } : x)),
        shouldRevalidateAfter: false,
      });
      await showToast({
        style: Toast.Style.Success,
        title: t(next ? (isClaudeCloudOnly(s) ? "hud.cloudSubscribed" : "hud.subscribed") : "hud.unsubscribed", {
          title: s.title || s.sessionId,
        }),
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: t("toast.error"), message: String(error) });
    }
  }

  return (
    <List
      isLoading={isLoading || indexing || searching || search !== debouncedSearch}
      isShowingDetail={showDetail && sessions.some((s) => key(s) === selectedId)}
      searchBarPlaceholder={t(config.contentSearchEnabled ? "search.allPlaceholder" : "search.titlesPlaceholder")}
      onSearchTextChange={setSearch}
      filtering={false}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <List.Dropdown tooltip={t("filter.title")} value={filter} onChange={(value) => setFilter(value as SessionFilter)}>
          <List.Dropdown.Item title={t("nav.all")} value="all" icon={Icon.List} />
          <List.Dropdown.Section>
            <List.Dropdown.Item title={t("section.subscribed")} value="subscribed" icon={Icon.Bell} />
            <List.Dropdown.Item title={t("section.needsInput")} value="needs_input" icon={Icon.Bubble} />
            <List.Dropdown.Item title={t("section.done")} value="done" icon={Icon.Checkmark} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title={t("action.refresh")} icon={Icon.ArrowClockwise} onAction={revalidate} />
          <SubscribeCurrentAction t={t} />
          <ConnectionActions />
        </ActionPanel>
      }
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title={t("empty.all.title")} description={t("empty.filter.desc")} />
      <List.Section
        title={t(
          filter === "all"
            ? "nav.all"
            : filter === "subscribed"
              ? "section.subscribed"
              : filter === "needs_input"
                ? "section.needsInput"
                : "section.done",
        )}
        subtitle={String(sessions.length)}
      >
        {sessions.map((s) => (
          <Row
            key={key(s)}
            s={s}
            t={t}
            config={config}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
            onToggle={() => toggle(s)}
            onRefresh={revalidate}
            match={config.contentSearchEnabled && search.trim() ? contentMatches[key(s)]?.snippet : undefined}
          />
        ))}
        {!isLoading && sessions.length === 0 && hasSearch && !config.contentSearchEnabled && (
          <List.Item icon={Icon.MagnifyingGlass} title={t("empty.all.title")} subtitle={t("empty.filter.desc")} />
        )}
      </List.Section>
      {config.contentSearchEnabled && (indexing || indexProgress.failed > 0) && (
        <List.Section>
          <List.Item
            id="search-index-status"
            icon={indexing ? Icon.ArrowClockwise : Icon.ExclamationMark}
            title={indexing ? t("search.indexing", { n: indexProgress.completed, total: indexProgress.total }) : t("search.indexFailed")}
            subtitle={indexing ? t("search.indexingDesc") : t("search.indexFailedDesc", { n: indexProgress.failed })}
            actions={
              <ActionPanel>
                <Action
                  title={t("action.refresh")}
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!config.contentSearchEnabled && hasSearch && (
        <List.Section>
          <List.Item
            id="enable-content-search"
            icon={Icon.MagnifyingGlass}
            title={t("search.enable")}
            subtitle={t("search.disabledDescription")}
            actions={
              <ActionPanel>
                <Action title={t("search.enable")} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function Row(props: {
  s: Session;
  t: Translator;
  config: Config;
  showDetail: boolean;
  onToggle: () => void;
  onToggleDetail: () => void;
  onRefresh: () => void;
  match?: string;
}) {
  const { s, t, config, showDetail } = props;
  const cloud = isClaudeCloudOnly(s);
  const project = projectName(s.cwd);
  const accessories: List.Item.Accessory[] = [];
  if (s.subscribed) accessories.push({ icon: { source: Icon.Bell, tintColor: Color.Yellow }, tooltip: t("section.subscribed") });
  const dot = statusDot(s);
  if (dot) accessories.push({ icon: dot, tooltip: statusLabel(s, t) });
  if (cloud) accessories.push({ icon: Icon.Cloud, tooltip: t("host.cloud") });
  else if (!showDetail && (s.status === "ready" || s.status === "unknown")) accessories.push({ text: statusLabel(s, t) });
  if (!showDetail && (!cloud || s.updatedAt)) accessories.push({ text: rowTime(s, t) });
  if (props.match && !showDetail) accessories.push({ icon: Icon.MagnifyingGlass, tooltip: t("search.contentMatch") });
  const subtitle = [project, hostTag(s.host), props.match].filter(Boolean).join(" · ");

  return (
    <List.Item
      id={key(s)}
      icon={agentIcon(s.agent)}
      title={s.title || s.sessionId}
      subtitle={showDetail ? undefined : subtitle}
      keywords={[project, s.summary, s.cwd].filter(Boolean)}
      accessories={accessories}
      detail={<SessionDetail session={s} t={t} />}
      actions={
        <ActionPanel title={s.title}>
          {/* Raycast assigns Return and Command-Return to the first two actions. */}
          <Action title={t("action.jump")} icon={Icon.ArrowNe} onAction={() => jumpBack(s, config, t)} />
          <Action
            title={s.subscribed ? t("action.unsubscribe") : t("action.subscribe")}
            icon={s.subscribed ? Icon.BellDisabled : Icon.Bell}
            onAction={props.onToggle}
          />
          <Action
            title={showDetail ? t("action.hideDetail") : t("action.detail")}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={props.onToggleDetail}
          />
          <Action
            title={t("action.refresh")}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
          <SubscribeCurrentAction t={t} />
          <ConnectionActions />
        </ActionPanel>
      }
    />
  );
}

function SubscribeCurrentAction({ t }: { t: Translator }) {
  return (
    <Action
      title={t("action.subscribeCurrent")}
      icon={Icon.Bell}
      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
      onAction={subscribeCurrent}
    />
  );
}
