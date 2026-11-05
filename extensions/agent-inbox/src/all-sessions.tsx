import { IndexQueue } from "./core/index-queue";
import { SessionLoadError } from "./components/SessionLoadError";
import { statusLabel } from "./core/format";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { hostTag, rowTime } from "./core/format";
import { isClaudeCloudOnly } from "./core/claude-desktop";
import { scanHistory } from "./core/history";
import { projectName } from "./core/paths";
import { mergeSessions } from "./core/merge";
import { filterSessions, SessionFilter } from "./core/status";
import { ContentMatches, IndexProgress, searchSessions, SessionSearchIndex } from "./core/search";
import { Config, Session } from "./core/types";
import { agentIcon, statusDot } from "./components/icons";
import { SessionDetail } from "./components/SessionDetail";
import { extensionConfig } from "./lib/env";
import { allSessions, jumpBack, store, refreshSessionTitles } from "./lib/sessions";
import { subscribeCurrent } from "./lib/subscribe-current";
import { ConnectionActions } from "./components/ConnectionActions";

const key = (s: { agent: string; sessionId: string }) => `${s.agent}:${s.sessionId}`;

export default function AllSessions() {
  const config = extensionConfig();
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contentMatches, setContentMatches] = useState<ContentMatches>({});
  const [searching, setSearching] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState<IndexProgress>({ completed: 0, total: 0, updated: 0, failed: 0 });
  const [indexRevision, setIndexRevision] = useState(0);
  const queue = useRef<IndexQueue | null>(null);
  const index = useMemo(() => new SessionSearchIndex(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
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
    if (!config.contentSearchEnabled) {
      setIndexing(false);
      setIndexProgress({ completed: 0, total: 0, updated: 0, failed: 0 });
      return;
    }
    const worker = new IndexQueue(index, {
      busy: setIndexing,
      progress: setIndexProgress,
      completed: () => setIndexRevision((revision) => revision + 1),
      failed: () => setIndexProgress((progress) => ({ ...progress, failed: Math.max(1, progress.failed) })),
    });
    queue.current = worker;
    return () => {
      worker.dispose();
      queue.current = null;
    };
  }, [index, config.contentSearchEnabled]);

  useEffect(() => {
    if (data) void queue.current?.update(data);
  }, [data, config.contentSearchEnabled]);

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

  const sessions = searchSessions(
    filterSessions(data ?? [], filter),
    search,
    config.contentSearchEnabled ? contentMatches : {},
  ).filter((s) => search.trim() || s.title || s.summary || s.subscribed || s.status !== "idle");
  const hasSearch = search.trim().length > 0;

  async function toggle(s: Session) {
    const next = !s.subscribed;
    try {
      await mutate(next ? store.subscribeEntry(s) : store.setSubscribed(s.agent, s.sessionId, false), {
        optimisticUpdate: (list) =>
          (list ?? []).map((x) =>
            key(x) === key(s) ? { ...x, subscribed: next, handledAt: next ? null : x.handledAt } : x,
          ),
        shouldRevalidateAfter: false,
      });
      await showToast({
        style: Toast.Style.Success,
        title: next
          ? isClaudeCloudOnly(s)
            ? "Subscribed: " + (s.title || s.sessionId) + " (cloud status unavailable)"
            : "Subscribed · " + (s.title || s.sessionId)
          : "Unsubscribed · " + (s.title || s.sessionId),
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not update subscription" });
    }
  }

  if (error && !data?.length) return <SessionLoadError error={error} retry={revalidate} isLoading={isLoading} />;

  return (
    <List
      isLoading={isLoading || indexing || searching || search !== debouncedSearch}
      isShowingDetail={showDetail && sessions.some((s) => key(s) === selectedId)}
      searchBarPlaceholder={
        config.contentSearchEnabled
          ? "Search titles and conversation content"
          : "Search conversation titles and projects"
      }
      onSearchTextChange={setSearch}
      filtering={false}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Sessions" value={filter} onChange={(value) => setFilter(value as SessionFilter)}>
          <List.Dropdown.Item title="All Sessions" value="all" icon={Icon.List} />
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Subscribed" value="subscribed" icon={Icon.Bell} />
            <List.Dropdown.Item title="Waiting for You" value="needs_input" icon={Icon.Bubble} />
            <List.Dropdown.Item title="Completed" value="done" icon={Icon.Checkmark} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <SubscribeCurrentAction />
          <ConnectionActions />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No sessions found"
        description="Try another filter or search term"
      />
      <List.Section
        title={
          filter === "all"
            ? "All Sessions"
            : filter === "subscribed"
              ? "Subscribed"
              : filter === "needs_input"
                ? "Waiting for You"
                : "Completed"
        }
        subtitle={String(sessions.length)}
      >
        {sessions.map((s) => (
          <Row
            key={key(s)}
            s={s}
            config={config}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
            onToggle={() => toggle(s)}
            onRefresh={revalidate}
            match={config.contentSearchEnabled && search.trim() ? contentMatches[key(s)]?.snippet : undefined}
          />
        ))}
        {!isLoading && sessions.length === 0 && hasSearch && !config.contentSearchEnabled && (
          <List.Item
            icon={Icon.MagnifyingGlass}
            title="No sessions found"
            subtitle="Try another filter or search term"
          />
        )}
      </List.Section>
      {config.contentSearchEnabled && (indexing || indexProgress.failed > 0) && (
        <List.Section>
          <List.Item
            id="search-index-status"
            icon={indexing ? Icon.ArrowClockwise : Icon.ExclamationMark}
            title={
              indexing
                ? "Indexing conversation content " + indexProgress.completed + "/" + indexProgress.total
                : "Some conversations could not be indexed"
            }
            subtitle={
              indexing
                ? "Titles are searchable now; content results fill in as indexing completes"
                : indexProgress.failed + " transcripts could not be read; title search is available. Press ⌘R to retry"
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
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
            title="Set Up Full-Text Search"
            subtitle="Enable Full-Text Search in extension preferences to search conversation content"
            actions={
              <ActionPanel>
                <Action title="Set up Full-Text Search" onAction={openExtensionPreferences} />
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
  config: Config;
  showDetail: boolean;
  onToggle: () => void;
  onToggleDetail: () => void;
  onRefresh: () => void;
  match?: string;
}) {
  const { s, config, showDetail } = props;
  const cloud = isClaudeCloudOnly(s);
  const project = projectName(s.cwd);
  const accessories: List.Item.Accessory[] | undefined = showDetail ? undefined : [];
  if (accessories) {
    if (s.subscribed) accessories.push({ icon: { source: Icon.Bell, tintColor: Color.Yellow }, tooltip: "Subscribed" });
    const dot = statusDot(s);
    if (dot) accessories.push({ icon: dot, tooltip: statusLabel(s) });
    if (cloud) accessories.push({ icon: Icon.Cloud, tooltip: "Claude cloud conversation" });
    else if (!showDetail && (s.status === "ready" || s.status === "unknown"))
      accessories.push({ text: statusLabel(s) });
    if (!showDetail && (!cloud || s.updatedAt)) accessories.push({ text: rowTime(s) });
    if (props.match && !showDetail)
      accessories.push({ icon: Icon.MagnifyingGlass, tooltip: "Conversation content match" });
  }
  const subtitle = [project, hostTag(s.host), props.match].filter(Boolean).join(" · ");

  return (
    <List.Item
      id={key(s)}
      icon={agentIcon(s.agent)}
      title={s.title || s.sessionId}
      subtitle={showDetail ? undefined : subtitle}
      keywords={[project, s.summary, s.cwd].filter(Boolean)}
      accessories={accessories}
      detail={<SessionDetail session={s} />}
      actions={
        <ActionPanel title={s.title}>
          {/* Raycast assigns Return and Command-Return to the first two actions. */}
          <Action title="Jump to Session" icon={Icon.ArrowNe} onAction={() => jumpBack(s, config)} />
          <Action
            title={s.subscribed ? "Unsubscribe" : "Subscribe"}
            icon={s.subscribed ? Icon.BellDisabled : Icon.Bell}
            onAction={props.onToggle}
          />
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={props.onToggleDetail}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
          <SubscribeCurrentAction />
          <ConnectionActions />
        </ActionPanel>
      }
    />
  );
}

function SubscribeCurrentAction() {
  return (
    <Action
      title="Subscribe to Current Conversation"
      icon={Icon.Bell}
      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
      onAction={subscribeCurrent}
    />
  );
}
