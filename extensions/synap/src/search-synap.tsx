import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { entityIcon, relativeDate, capitalize, statusColor } from "./utils/formatters";
import { openAppUrl, openUrl } from "./utils/deeplinks";
import { useEntitySearch, useRecentEntities, useSemanticSearch, useQueryRouting } from "./hooks/useEntities";
import { useWorkspaces, useProfiles } from "./hooks/useWorkspace";
import {
  useConnection,
  ConnectionErrorEmptyView,
  ConnectionErrorActions,
  describeConnectionError,
} from "./components/connection";
import { ConnectionProblem } from "./api/client";
import EntityDetail from "./entity-detail";
import type { SynapEntity, SynapWorkspace } from "./api/types";

// Search mode: AUTO asks the pod's query-understanding door what a query means
// and routes accordingly (structured type match → filtered listing, a question
// → semantic recall). ⌘⇧S cycles auto → keyword → semantic → auto as a manual
// override — the same cycle a stale/unreachable understanding door falls back
// out of automatically.
type ModeOverride = "auto" | "keyword" | "semantic";
const MODE_CYCLE: ModeOverride[] = ["auto", "keyword", "semantic"];

// The search-mode cycle action (⌘⇧S). Hoisted out of the per-item ActionPanel so
// it's reachable everywhere the user might want it — including the empty-result
// and connection-problem states, where a failed keyword search is exactly when
// you'd reach for semantic recall.
function ModeCycleAction({ modeOverride, onCycleMode }: { modeOverride: ModeOverride; onCycleMode: () => void }) {
  return (
    <Action
      title="Cycle Search Mode"
      icon={
        modeOverride === "semantic" ? Icon.BulletPoints : modeOverride === "keyword" ? Icon.MagnifyingGlass : Icon.Wand
      }
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={onCycleMode}
    />
  );
}

function EntityListItem({
  entity,
  podUrl,
  workspaces,
  filterWorkspaceId,
  onFilterWorkspace,
  modeOverride,
  onCycleMode,
}: {
  entity: SynapEntity;
  podUrl: string;
  workspaces: SynapWorkspace[];
  filterWorkspaceId: string | null;
  onFilterWorkspace: (id: string | null) => void;
  modeOverride: ModeOverride;
  onCycleMode: () => void;
}) {
  const { icon, tintColor } = entityIcon(entity.profileSlug);
  const isMemory = entity.profileSlug === "memory";
  const displayTitle = entity.title || "(Untitled)";
  const displaySubtitle = isMemory ? "Memory" : capitalize(entity.profileSlug);

  const accessories: List.Item.Accessory[] = [];
  if (!isMemory) {
    if (entity.status) {
      accessories.push({ tag: { value: capitalize(entity.status), color: statusColor(entity.status) } });
    }
    if (entity.priority && entity.priority !== "medium") {
      const priorityColors: Record<string, Color> = {
        urgent: Color.Red,
        high: Color.Orange,
        low: Color.SecondaryText,
      };
      accessories.push({
        tag: { value: capitalize(entity.priority), color: priorityColors[entity.priority] ?? Color.SecondaryText },
      });
    }
    if (entity.dueDate) {
      const due = new Date(entity.dueDate);
      const isOverdue = due < new Date();
      accessories.push({
        icon: { source: Icon.Calendar, tintColor: isOverdue ? Color.Red : Color.SecondaryText },
        text: { value: relativeDate(entity.dueDate), color: isOverdue ? Color.Red : Color.SecondaryText },
      });
    }
    // Show workspace name when browsing all workspaces
    if (workspaces.length > 1 && !filterWorkspaceId && entity.workspaceId) {
      const ws = workspaces.find((w) => w.id === entity.workspaceId);
      if (ws) {
        accessories.push({ tag: { value: ws.name, color: Color.SecondaryText } });
      }
    }
  }
  accessories.push({ text: { value: relativeDate(entity.updatedAt), color: Color.SecondaryText } });

  return (
    <List.Item
      icon={{ source: icon, tintColor }}
      title={displayTitle}
      subtitle={displaySubtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="View Details" icon={Icon.Sidebar} target={<EntityDetail entityId={entity.id} />} />
            <Action.OpenInBrowser title="Open in Synap" url={openAppUrl("entity", entity.id)} icon={Icon.Window} />
            {podUrl && (
              <Action.OpenInBrowser title="Open in Browser" url={openUrl(podUrl, entity.id)} icon={Icon.Globe} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Title"
              content={entity.title}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Entity Id"
              content={entity.id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {podUrl && (
              <Action.CopyToClipboard
                title="Copy Link"
                content={openUrl(podUrl, entity.id)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          {workspaces.length > 1 && (
            <ActionPanel.Section title="Filter by Workspace">
              {filterWorkspaceId && (
                <Action
                  title="Show All Workspaces"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  onAction={() => onFilterWorkspace(null)}
                />
              )}
              {workspaces
                .filter((w) => w.id !== filterWorkspaceId)
                .map((w) => (
                  <Action
                    key={w.id}
                    title={`Filter: ${w.name}`}
                    icon={Icon.Building}
                    onAction={() => onFilterWorkspace(w.id)}
                  />
                ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Search Mode">
            <ModeCycleAction modeOverride={modeOverride} onCycleMode={onCycleMode} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function SearchSynap() {
  const [query, setQuery] = useState("");
  // null = no manual pick yet — the dropdown shows whatever AUTO routing
  // suggests. Any explicit pick (including "All Types") overrides it until
  // the search text is cleared, which resets to a fresh auto-suggestion.
  const [manualProfileSlug, setManualProfileSlug] = useState<string | null>(null);
  const [filterWorkspaceId, setFilterWorkspaceId] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<ModeOverride>("auto");

  useEffect(() => {
    if (query.length === 0) setManualProfileSlug(null);
  }, [query]);

  const { connection, isLoading: connLoading, podKey, revalidate: revalidateConnection } = useConnection();
  const connected = connection != null;
  const podUrl = connection?.podUrl ?? "";

  const { data: workspaces = [] } = useWorkspaces(podKey);
  const profilesWorkspaceId = filterWorkspaceId ?? workspaces[0]?.id;
  const { data: profiles = [] } = useProfiles(connected ? profilesWorkspaceId : undefined, podKey);

  const { data: route, isLoading: routeLoading } = useQueryRouting(query, {
    execute: connected && modeOverride === "auto",
    workspaceId: filterWorkspaceId ?? undefined,
    podKey,
  });

  const autoProfileSlug = modeOverride === "auto" && route?.mode === "structured" ? route.profileSlug : undefined;
  const autoSemantic = modeOverride === "auto" && route?.mode === "semantic";
  const semanticMode = modeOverride === "semantic" || autoSemantic;
  const profileSlug = manualProfileSlug ?? autoProfileSlug ?? "";

  // Once the AUTO-inferred type filter is active, search the RESIDUAL (type
  // words stripped) so the lexical query stays clean — "people at acme" filters
  // to person and searches "acme". cleanedQuery === "" is MEANINGFUL (backend
  // contract): a pure type listing ("show all people") — no keyword search at
  // all, browse the type via the recent-entities door instead. Only a missing
  // cleanedQuery (old pod) falls back to the raw text.
  const isTypeBrowse =
    modeOverride === "auto" && route?.mode === "structured" && route.cleanedQuery === "" && !!autoProfileSlug;
  const searchText =
    route?.mode === "structured" && modeOverride === "auto" && route.cleanedQuery != null ? route.cleanedQuery : query;

  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    revalidate: revalidateSearch,
  } = useEntitySearch(searchText, profileSlug || undefined, {
    execute: connected && !semanticMode && !isTypeBrowse,
    workspaceId: filterWorkspaceId ?? undefined,
    podKey,
  });
  const {
    data: semanticResults,
    isLoading: semanticLoading,
    error: semanticError,
    revalidate: revalidateSemantic,
  } = useSemanticSearch(query, {
    execute: connected && semanticMode,
    workspaceId: filterWorkspaceId ?? undefined,
    podKey,
  });
  const {
    data: recentEntities,
    isLoading: recentLoading,
    error: recentError,
    revalidate: revalidateRecent,
  } = useRecentEntities(profileSlug || undefined, {
    execute: connected && !semanticMode,
    workspaceId: filterWorkspaceId ?? undefined,
    podKey,
  });

  // The error for whatever the user is currently looking at. When set, we show
  // the problem + remedies instead of silently rendering stale or empty results.
  // A routing miss is never surfaced here — useQueryRouting degrades silently.
  const keywordActive = query.length > 0 && !isTypeBrowse;
  const activeError = semanticMode ? semanticError : keywordActive ? searchError : recentError;
  const retryActive = () => {
    revalidateConnection();
    if (semanticMode) revalidateSemantic();
    else if (keywordActive) revalidateSearch();
    else revalidateRecent();
  };

  const cycleMode = () => setModeOverride((m) => MODE_CYCLE[(MODE_CYCLE.indexOf(m) + 1) % MODE_CYCLE.length]);

  const isLoading =
    connLoading ||
    (modeOverride === "auto" && query.length > 0 && routeLoading) ||
    (semanticMode ? semanticLoading : keywordActive ? searchLoading : recentLoading);

  const entities = semanticMode
    ? (semanticResults ?? [])
    : keywordActive
      ? (searchResults ?? [])
      : (recentEntities ?? []);

  const activeWorkspaceName = filterWorkspaceId
    ? (workspaces.find((w) => w.id === filterWorkspaceId)?.name ?? filterWorkspaceId)
    : null;

  const autoProfileLabel = autoProfileSlug
    ? (profiles.find((p) => p.slug === autoProfileSlug)?.displayName ?? capitalize(autoProfileSlug))
    : null;

  // Glass-box routing: say honestly what decided this result set, matching
  // the CLI's `synap ask` transparency — never silently pick a mode.
  const modePrefix =
    modeOverride === "semantic"
      ? "Semantic · "
      : autoSemantic
        ? "Semantic recall · "
        : autoProfileLabel
          ? `${autoProfileLabel} — matched type · `
          : "";
  const sectionTitle = isTypeBrowse
    ? `${modePrefix}${activeWorkspaceName ? `All in ${activeWorkspaceName}` : "All"}`
    : activeWorkspaceName
      ? `${modePrefix}${query.length > 0 ? `Results in ${activeWorkspaceName}` : `Recent in ${activeWorkspaceName}`}`
      : query.length > 0
        ? `${modePrefix}Results for "${query}"`
        : "Recent — all workspaces";

  if (!connLoading && !connected) {
    return (
      <List navigationTitle="Search Synap">
        <ConnectionErrorEmptyView error={new ConnectionProblem("not-configured", null)} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={connection?.podName ? `Search Synap — ${connection.podName}` : "Search Synap"}
      searchBarPlaceholder={
        semanticMode
          ? activeWorkspaceName
            ? `Semantic search in ${activeWorkspaceName}…`
            : "Semantic memory search…"
          : activeWorkspaceName
            ? `Search in ${activeWorkspaceName}…`
            : "Search your knowledge graph…"
      }
      onSearchTextChange={setQuery}
      throttle
      // List-level fallback actions (shown when there are no children) so the
      // mode cycle is reachable even with an empty result set.
      actions={
        <ActionPanel>
          <ModeCycleAction modeOverride={modeOverride} onCycleMode={cycleMode} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" value={profileSlug} onChange={setManualProfileSlug}>
          <List.Dropdown.Item key="" title="All Types" value="" />
          {profiles.map((p) => (
            <List.Dropdown.Item key={p.slug} title={p.displayName} value={p.slug} />
          ))}
        </List.Dropdown>
      }
    >
      {activeError ? (
        // A connection problem on a live search: keep the exact remedy actions,
        // and add the mode cycle — a failed keyword search is precisely when the
        // user wants to try semantic recall instead.
        <List.EmptyView
          icon={{ source: Icon.Plug, tintColor: Color.Red }}
          title={describeConnectionError(activeError).title}
          description={describeConnectionError(activeError).description}
          actions={
            <ActionPanel>
              <ConnectionErrorActions error={activeError} onRetry={retryActive} />
              <ModeCycleAction modeOverride={modeOverride} onCycleMode={cycleMode} />
            </ActionPanel>
          }
        />
      ) : entities.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            semanticMode
              ? "No memories found"
              : isTypeBrowse
                ? `No ${(autoProfileLabel ?? "entities").toLowerCase()} yet`
                : query.length > 0
                  ? "No results found"
                  : "Your pod is empty"
          }
          description={
            semanticMode
              ? `No memories match "${query}" — try a different phrase`
              : isTypeBrowse
                ? "Nothing of this type in your pod yet"
                : query.length > 0
                  ? `No entities match "${query}"`
                  : "Start capturing things in Synap"
          }
          actions={
            <ActionPanel>
              <ModeCycleAction modeOverride={modeOverride} onCycleMode={cycleMode} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={sectionTitle} subtitle={`${entities.length}`}>
          {entities.map((entity) => (
            <EntityListItem
              key={entity.id}
              entity={entity}
              podUrl={podUrl}
              workspaces={workspaces}
              filterWorkspaceId={filterWorkspaceId}
              onFilterWorkspace={setFilterWorkspaceId}
              modeOverride={modeOverride}
              onCycleMode={cycleMode}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
