import { Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { UsageActions } from "./components/usage-actions";
import { UsageDetail } from "./components/usage-detail";
import { useNetwork } from "./hooks/use-network";
import { formatBytes, formatRate, markdownText, summary } from "./lib/format";
import { orderApps, updateListLayout, type ListLayout } from "./lib/list-layout";
import { combinedRate, QUIET_BYTES_PER_SECOND, visibleApps } from "./lib/usage";
import { preferences } from "./preferences";
import type { AppUsage, SortBy } from "./types";

export default function NetworkHogs() {
  const { state, paused, togglePause, retry } = useNetwork();
  const prefs = preferences();
  const [sort, setSort] = useState<SortBy>("combined");
  const [showQuiet, setShowQuiet] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layout, setLayout] = useState<ListLayout>({ sort: "combined", order: [], revealed: [] });
  const snapshot = state.snapshot;
  const allApps = useMemo(
    () => (snapshot ? visibleApps(snapshot, prefs.hideSystemDaemons) : []),
    [snapshot, prefs.hideSystemDaemons],
  );
  const nextLayout = useMemo(
    () => updateListLayout(layout, allApps, sort, selectedId),
    [layout, allApps, sort, selectedId],
  );
  useEffect(() => {
    if (nextLayout !== layout) setLayout(nextLayout);
  }, [nextLayout, layout]);
  const sorted = orderApps(allApps, nextLayout);
  const query = search.trim().toLocaleLowerCase();
  const filtered = sorted.filter((app) =>
    [app.name, ...app.processes.map((info) => `${info.name} ${info.pid}`)].some((text) =>
      text.toLocaleLowerCase().includes(query),
    ),
  );
  const revealedIds = new Set(nextLayout.revealed);
  const displayed = filtered.filter((app) => showQuiet || query || revealedIds.has(app.id));
  const quiet = filtered.filter((app) => !revealedIds.has(app.id));
  const activeCount = filtered.filter((app) => combinedRate(app) >= QUIET_BYTES_PER_SECOND).length;
  const hasQuietRow = !showQuiet && !query && quiet.length > 0;
  const selectedItemId =
    displayed.some((app) => app.id === selectedId) ||
    (selectedId === "quiet-apps" && hasQuietRow) ||
    (selectedId === "sampling-error" && state.kind === "error")
      ? (selectedId ?? undefined)
      : state.kind === "error"
        ? "sampling-error"
        : (displayed[0]?.id ?? (hasQuietRow ? "quiet-apps" : undefined));
  const totalRate = allApps.reduce((total, app) => total + combinedRate(app), 0);
  const copySummary = snapshot
    ? summary(snapshot, allApps, prefs.units)
    : "Network Hogs is collecting its first sample.";
  const stale = paused || state.kind !== "live";
  const actions = (app?: AppUsage, quietSummary = false) => (
    <UsageActions
      app={app}
      copySummary={copySummary}
      paused={paused}
      onTogglePause={togglePause}
      showQuiet={showQuiet}
      onToggleQuiet={() => setShowQuiet((value) => !value)}
      showCharts={showCharts}
      onToggleCharts={() => setShowCharts((value) => !value)}
      onReorder={() => setLayout(updateListLayout(nextLayout, allApps, sort, selectedItemId ?? null, true))}
      quietSummary={quietSummary}
      onRetry={state.kind === "error" ? retry : undefined}
    />
  );

  function row(app: AppUsage) {
    return (
      <List.Item
        key={app.id}
        id={app.id}
        title={app.name}
        icon={app.identity.kind === "app" ? { fileIcon: app.identity.path } : Icon.Terminal}
        accessories={
          showCharts
            ? [
                {
                  text: formatRate(
                    sort === "download" ? app.downloadBps : sort === "upload" ? app.uploadBps : combinedRate(app),
                    prefs.units,
                  ),
                  tooltip: `↓ ${formatRate(app.downloadBps, prefs.units)} · ↑ ${formatRate(app.uploadBps, prefs.units)} · ${formatBytes(app.downloadedBytes + app.uploadedBytes)} observed`,
                },
              ]
            : [
                {
                  text: formatRate(app.downloadBps, prefs.units),
                  tooltip: "Download rate",
                  icon: { source: Icon.ArrowDown, tintColor: Color.Blue },
                },
                {
                  text: formatRate(app.uploadBps, prefs.units),
                  icon: { source: Icon.ArrowUp, tintColor: Color.Purple },
                  tooltip: "Upload rate",
                },
                { text: formatBytes(app.downloadedBytes + app.uploadedBytes), tooltip: "Observed this session" },
              ]
        }
        detail={
          showCharts && app.id === selectedItemId ? (
            <UsageDetail
              app={app}
              units={prefs.units}
              totalRate={totalRate}
              paused={stale}
              sampledSeconds={snapshot?.sampledSeconds ?? 0}
              animate={prefs.animateCharts}
            />
          ) : undefined
        }
        actions={actions(app)}
      />
    );
  }

  return (
    <List
      isLoading={!paused && state.kind === "loading"}
      isShowingDetail={showCharts}
      filtering={false}
      navigationTitle={`Network Hogs${paused ? " · Paused" : ""}`}
      searchBarPlaceholder="Filter apps or process IDs…"
      onSearchTextChange={setSearch}
      onSelectionChange={setSelectedId}
      selectedItemId={selectedItemId}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Apps"
          value={sort}
          onChange={(value) => {
            if (value === "combined" || value === "download" || value === "upload") setSort(value);
          }}
        >
          <List.Dropdown.Item value="combined" title="Combined" />
          <List.Dropdown.Item value="download" title="Download" />
          <List.Dropdown.Item value="upload" title="Upload" />
        </List.Dropdown>
      }
    >
      {state.kind === "error" && (
        <List.Item
          id="sampling-error"
          title="Monitoring stopped"
          subtitle="Retry to get current rates"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`## Monitoring stopped\n\n${markdownText(state.message)}\n\nAny rates shown are from the last successful sample.`}
            />
          }
          actions={actions()}
        />
      )}
      {!snapshot && state.kind !== "error" && (
        <List.EmptyView
          icon={paused ? Icon.Pause : Icon.Network}
          title={paused ? "Monitoring paused" : "Measuring network activity…"}
          description={
            paused ? "Resume to collect your first sample." : "Your first rates will appear in about two seconds."
          }
          actions={actions()}
        />
      )}
      {snapshot && (
        <>
          <List.Section
            title={
              paused
                ? "Paused"
                : state.kind === "loading"
                  ? "Resuming…"
                  : state.kind === "error"
                    ? "Last sample"
                    : "Apps"
            }
            subtitle={`${activeCount} active · ⌘ R to sort`}
          >
            {displayed.map(row)}
          </List.Section>
          {hasQuietRow && (
            <List.Section title="Quiet">
              <List.Item
                id="quiet-apps"
                title={`${quiet.length} quiet ${quiet.length === 1 ? "app" : "apps"}`}
                icon={Icon.ChevronRight}
                accessories={[{ text: "⌘ ⇧ K to show" }]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${activeCount ? "Quiet apps" : "Your network is quiet"}\n\n${quiet.length} apps are using less than 1 KB/s each.\n\nPress **⌘ ⇧ K** to show them. Search also includes quiet apps.`}
                  />
                }
                actions={actions(undefined, true)}
              />
            </List.Section>
          )}
          {filtered.length === 0 && (
            <List.EmptyView
              icon={Icon.Network}
              title={query ? "No matching apps" : "No apps to show"}
              description={
                query
                  ? "Try an app name or process ID."
                  : "System daemons may be hidden. You can show them in Extension Preferences."
              }
              actions={actions()}
            />
          )}
        </>
      )}
    </List>
  );
}
