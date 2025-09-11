import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  getPreferenceValues,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { sb } from "./lib/supabase";
import type { Model } from "./lib/types";
import { usePinnedModels, usePinnedModelsData, splitPinned } from "./lib/usePinnedModels";

// Full set of columns required to render ModelDetail and main Search list
const MODEL_FULL_COLUMNS =
  "id,name,slug,creator_name,creator_slug,aa_intelligence_index,aa_coding_index,aa_math_index,mmlu_pro,gpqa,livecodebench,scicode,math_500,aime,hle,median_output_tokens_per_second,median_time_to_first_token_seconds,price_1m_input_tokens,price_1m_output_tokens,price_1m_blended_3_to_1,pricing,evaluations,first_seen,last_seen";

// Model type imported from ./lib/types

type Mode = "search" | "leaderboards";

const METRICS = [
  { key: "mmlu_pro", label: "MMLU Pro (desc)" },
  { key: "gpqa", label: "GPQA (desc)" },
  { key: "livecodebench", label: "LiveCodeBench (desc)" },
  { key: "median_output_tokens_per_second", label: "Median TPS (desc)" },
  { key: "median_time_to_first_token_seconds", label: "Median TTFT (asc)" },
  { key: "price_1m_input_tokens", label: "Price per 1M Input Tokens (asc)" },
  { key: "price_1m_output_tokens", label: "Price per 1M Output Tokens (asc)" },
  { key: "price_1m_blended_3_to_1", label: "Blended Price (3:1) (asc)" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

// Typed registry for leaderboard sort order
const METRIC_ASC: Record<MetricKey, boolean> = {
  mmlu_pro: false,
  gpqa: false,
  livecodebench: false,
  median_output_tokens_per_second: false,
  median_time_to_first_token_seconds: true,
  price_1m_input_tokens: true,
  price_1m_output_tokens: true,
  price_1m_blended_3_to_1: true,
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "N/A";
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  } catch {
    return "N/A";
  }
}

function isMissing(v: number | null | undefined): boolean {
  return v == null || v === 0;
}

function na(v: number | string | null | undefined): string {
  if (typeof v === "number") return isMissing(v) ? "N/A" : String(v);
  return v == null || v === "" ? "N/A" : String(v);
}

export default function View() {
  // Always start in Search (do not persist mode to avoid initial flicker)
  const [mode, setMode] = useState<Mode>("search");
  const { value: metric = "mmlu_pro", setValue: setMetric } = useLocalStorage<MetricKey>("ai-stats-metric", "mmlu_pro");
  const [searchText, setSearchText] = useState<string>("");
  const { value: creatorFilter = "", setValue: setCreatorFilter } = useLocalStorage<string>("ai-stats-creator", "");
  const { pinnedIds, addPin, removePin, movePin } = usePinnedModels(10);
  const [listLoading, setListLoading] = useState(false);

  return (
    <List
      isLoading={listLoading}
      searchBarPlaceholder={
        mode === "search" ? "Search models by name, slug, or creator…" : "Filter leaderboard by name, slug, or creator…"
      }
      onSearchTextChange={(t) => setSearchText(t)}
      searchText={searchText}
      searchBarAccessory={
        <>
          <List.Dropdown tooltip="Mode" value={mode} onChange={(v) => setMode(v as Mode)}>
            <List.Dropdown.Item value="search" title="Search" />
            <List.Dropdown.Item value="leaderboards" title="Leaderboards" />
          </List.Dropdown>
          {mode === "search" && <CreatorFilterDropdown value={creatorFilter} onChange={setCreatorFilter} />}
          {mode === "search" && creatorFilter && (
            <List.Dropdown
              tooltip="Active Creator Filter"
              value="set"
              onChange={(v) => {
                if (v === "clear") {
                  void setCreatorFilter("");
                }
              }}
            >
              <List.Dropdown.Item value="set" title={`Creator: ${creatorFilter}`} />
              <List.Dropdown.Item value="clear" title="Clear" />
            </List.Dropdown>
          )}
          {mode === "leaderboards" && (
            <List.Dropdown tooltip="Metric" onChange={(v) => setMetric(v as MetricKey)}>
              {METRICS.map((m) => (
                <List.Dropdown.Item key={m.key} value={m.key} title={m.label} />
              ))}
            </List.Dropdown>
          )}
        </>
      }
    >
      {mode === "search" ? (
        <SearchSection
          setMode={setMode}
          searchText={searchText}
          setSearchText={setSearchText}
          creatorFilter={creatorFilter}
          setCreatorFilter={setCreatorFilter}
          pinnedIds={pinnedIds}
          addPin={addPin}
          removePin={removePin}
          movePin={movePin}
          onLoadingChange={setListLoading}
        />
      ) : (
        <LeaderboardSection
          metric={metric}
          setMode={setMode}
          setMetric={setMetric}
          onLoadingChange={setListLoading}
          pinnedIds={pinnedIds}
          addPin={addPin}
          removePin={removePin}
          searchText={searchText}
        />
      )}
    </List>
  );
}

type SearchSectionProps = {
  setMode: (m: Mode) => void;
  searchText: string;
  setSearchText: (v: string) => void | Promise<void>;
  creatorFilter: string;
  setCreatorFilter: (v: string) => void | Promise<void>;
  pinnedIds: string[];
  addPin: (id: string) => void | Promise<void>;
  removePin: (id: string) => void | Promise<void>;
  movePin: (id: string, delta: number) => void | Promise<void>;
  onLoadingChange: (loading: boolean) => void;
};

function SearchSection({
  setMode,
  searchText,
  setSearchText,
  creatorFilter,
  setCreatorFilter,
  pinnedIds,
  addPin,
  removePin,
  movePin,
  onLoadingChange,
}: SearchSectionProps) {
  const [q, setQ] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSkel, setShowSkel] = useState(false);

  // forward loading state to parent List
  const {
    data: rows = [],
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (query: string, creator: string) => {
      const client = sb();
      let base = client.from("aa_models").select(MODEL_FULL_COLUMNS).limit(100);
      if (query) {
        base = base.or(`name.ilike.*${query}*,slug.ilike.*${query}*,creator_name.ilike.*${query}*`);
      }
      if (creator) {
        base = base.eq("creator_name", creator);
      }
      base = base.order("last_seen", { ascending: false });
      const { data, error } = await base;
      if (error) throw error;
      return (data ?? []) as unknown as Model[];
    },
    [q, creatorFilter],
    { keepPreviousData: true },
  );

  useEffect(() => {
    const shouldShow = isLoading && rows.length === 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (shouldShow) {
      t = setTimeout(() => onLoadingChange(true), 120);
    } else {
      onLoadingChange(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [isLoading, rows, onLoadingChange]);
  // Debounced skeleton reveal to avoid flashing on quick cache hits
  useEffect(() => {
    const shouldShow = isLoading && rows.length === 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (shouldShow) {
      t = setTimeout(() => setShowSkel(true), 120);
    } else {
      setShowSkel(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [isLoading, rows]);

  // React to parent search text or creator filter changes
  useEffect(() => {
    // Avoid duplicate initial fetch when value hasn't changed
    if (searchText === q) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQ(searchText), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [searchText, q]);

  // Always include pinned models even if they don't match the current query
  const { pinnedModels: pinnedFull } = usePinnedModelsData(MODEL_FULL_COLUMNS, pinnedIds);
  const mergedMap = new Map<string, Model>();
  rows.forEach((r) => mergedMap.set(r.id, r));
  pinnedFull.forEach((m) => {
    if (pinnedIds.includes(m.id) && !mergedMap.has(m.id)) mergedMap.set(m.id, m as Model);
  });
  const mergedRows = Array.from(mergedMap.values());
  const { pinned: pinnedRows, unpinned: listRows } = splitPinned(mergedRows, pinnedIds);
  const updatedLabel = rows.length > 0 && rows[0]?.last_seen ? `Updated ${timeAgo(rows[0].last_seen)}` : undefined;

  const showSearchSkeleton = showSkel;

  return (
    <>
      {/* Loading state handled by parent List's isLoading spinner to avoid empty-state flicker */}
      {showSearchSkeleton && (
        <List.Section title="Loading…">
          {Array.from({ length: 6 }).map((_, i) => (
            <List.Item
              key={`search-skeleton-${i}`}
              title="Loading…"
              subtitle=""
              accessories={[{ tag: { value: "…", color: Color.SecondaryText } }]}
              icon={Icon.Circle}
            />
          ))}
        </List.Section>
      )}
      {(creatorFilter || q) && (
        <List.Section title="Filters">
          <List.Item
            title={`${creatorFilter ? `Creator: ${creatorFilter}` : ""}${creatorFilter && q ? " • " : ""}${q ? `Search: "${q}"` : ""}`}
            icon={Icon.Filter}
            actions={
              <ActionPanel>
                <Action
                  title="Reset Filters"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={async () => {
                    await setCreatorFilter("");
                    await setSearchText("");
                    setQ("");
                    await revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!isLoading && rows.length === 0 ? (
        <List.EmptyView title="No models found" description="Try another search term" />
      ) : null}
      {pinnedRows.length > 0 && (
        <List.Section title="Pinned">
          {pinnedRows.map((m) => {
            const accessories = accessoriesForModel(m, true);
            return (
              <List.Item
                key={`pinned-${m.id}`}
                title={m.name ?? m.slug ?? "Unnamed"}
                subtitle={m.creator_name ?? ""}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Details"
                      icon={Icon.Sidebar}
                      target={<ModelDetail model={m} pinnedIds={pinnedIds} addPin={addPin} removePin={removePin} />}
                    />
                    <Action
                      title="Unpin Model"
                      icon={Icon.PinDisabled}
                      shortcut={{ modifiers: ["opt"], key: "enter" }}
                      onAction={async () => {
                        await removePin(m.id);
                        await showToast({ style: Toast.Style.Success, title: "Unpinned Model" });
                      }}
                    />
                    <Action title="Move Pin up" icon={Icon.ArrowUp} onAction={() => movePin(m.id, -1)} />
                    <Action title="Move Pin Down" icon={Icon.ArrowDown} onAction={() => movePin(m.id, 1)} />
                    <Action
                      title="Switch to Leaderboards"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      onAction={() => setMode("leaderboards")}
                    />
                    <ActionPanel.Submenu title="Filter by Creator" shortcut={{ modifiers: ["cmd"], key: "p" }}>
                      <Action title="All Creators" onAction={() => setCreatorFilter("")} />
                      {[...new Set(rows.map((r) => r.creator_name).filter(Boolean) as string[])].map((name) => (
                        <Action key={name} title={name} onAction={() => setCreatorFilter(name)} />
                      ))}
                    </ActionPanel.Submenu>
                    <Action
                      title="Reset Filters"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        await setCreatorFilter("");
                        await setSearchText("");
                        setQ("");
                        await revalidate();
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Name" content={m.name ?? ""} />
                    <Action.CopyToClipboard title="Copy Slug" content={m.slug ?? ""} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <List.Section title="Models" subtitle={updatedLabel ?? q}>
        {listRows.map((m) => {
          const isPinned = pinnedIds.includes(m.id);
          const accessories = accessoriesForModel(m, isPinned);
          return (
            <List.Item
              key={m.id}
              title={m.name ?? m.slug ?? "Model"}
              subtitle={m.creator_name ?? ""}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Details"
                    icon={Icon.Sidebar}
                    target={<ModelDetail model={m} pinnedIds={pinnedIds} addPin={addPin} removePin={removePin} />}
                  />
                  <Action
                    title="Switch to Leaderboards"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() => setMode("leaderboards")}
                  />
                  <ActionPanel.Submenu
                    title="Filter by Creator"
                    icon={Icon.Person}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                  >
                    <Action title="All Creators" icon={Icon.Person} onAction={() => setCreatorFilter("")} />
                    {[...new Set(rows.map((r) => r.creator_name).filter(Boolean) as string[])].map((name) => (
                      <Action key={name} title={name} icon={Icon.Person} onAction={() => setCreatorFilter(name)} />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Reset Filters"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      await setCreatorFilter("");
                      await setSearchText("");
                      setQ("");
                      await revalidate();
                    }}
                  />
                  {isPinned ? (
                    <Action
                      title="Unpin Model"
                      icon={Icon.PinDisabled}
                      shortcut={{ modifiers: ["opt"], key: "enter" }}
                      onAction={async () => {
                        await removePin(m.id);
                        await showToast({ style: Toast.Style.Success, title: "Unpinned Model" });
                      }}
                    />
                  ) : (
                    <Action
                      title="Pin Model"
                      icon={Icon.Pin}
                      shortcut={{ modifiers: ["opt"], key: "enter" }}
                      onAction={async () => {
                        await addPin(m.id);
                        await showToast({ style: Toast.Style.Success, title: "Pinned Model" });
                      }}
                    />
                  )}
                  {isPinned && (
                    <>
                      <Action title="Move Pin up" icon={Icon.ArrowUp} onAction={() => movePin(m.id, -1)} />
                      <Action title="Move Pin Down" icon={Icon.ArrowDown} onAction={() => movePin(m.id, 1)} />
                    </>
                  )}
                  <Action.CopyToClipboard title="Copy Name" icon={Icon.Clipboard} content={m.name ?? ""} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </>
  );
}

type LeaderboardSectionProps = {
  metric: MetricKey;
  setMode: (m: Mode) => void;
  setMetric: (m: MetricKey) => void;
  onLoadingChange: (loading: boolean) => void;
  pinnedIds: string[];
  addPin: (id: string) => void | Promise<void>;
  removePin: (id: string) => void | Promise<void>;
  searchText: string;
};

function LeaderboardSection({
  metric,
  setMode,
  setMetric,
  onLoadingChange,
  pinnedIds,
  addPin,
  removePin,
  searchText,
}: LeaderboardSectionProps) {
  const isAsc = useMemo(() => METRIC_ASC[metric], [metric]);
  const [showSkel, setShowSkel] = useState(false);
  const [showPinnedSkel, setShowPinnedSkel] = useState(false);

  const {
    data: rows = [],
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (m: MetricKey) => {
      const client = sb();
      const columns = `id,name,slug,creator_name,${m}`;
      const { data, error } = await client
        .from("aa_models")
        .select(columns)
        .not(m, "is", null)
        .gt(m, 0)
        .order(m, { ascending: METRIC_ASC[m] })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Model[];
    },
    [metric],
    { keepPreviousData: false },
  );

  // Parent spinner and skeletons are shown with a short delay to avoid flashes
  // of loading UI on quick cache hits

  // Universal pinned models: fetch by IDs via shared hook so pins appear regardless of leaderboard slice
  const { pinnedModels, isLoading: pinnedLoading } = usePinnedModelsData(
    `id,name,slug,creator_name,${metric}`,
    pinnedIds,
  );

  // helper to render a leaderboard row with actions and tags
  const renderItem = (r: Model) => {
    const accessories: List.Item.Accessory[] = [];
    const isPinned = pinnedIds.includes(r.id);
    if (isPinned) accessories.push({ tag: { value: "Pinned", color: Color.Purple } });
    const value = (r as unknown as Record<string, number | null>)[metric];
    if (value != null && value !== 0) {
      accessories.push({ tag: { value: formatMetricValue(metric, value), color: colorForMetric(metric) } });
    } else {
      accessories.push({ tag: { value: "N/A", color: Color.SecondaryText } });
    }
    const rank = rankById.get(r.id);
    const title = `${rank ? `${rank}. ` : ""}${r.name ?? r.slug ?? "Model"}`;
    return (
      <List.Item
        key={r.id}
        title={title}
        subtitle={r.creator_name ?? ""}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Details"
              icon={Icon.Sidebar}
              target={
                <ModelDetail
                  model={r as unknown as Model}
                  pinnedIds={pinnedIds}
                  addPin={addPin}
                  removePin={removePin}
                />
              }
            />
            <Action
              title={isPinned ? "Unpin Model" : "Pin Model"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              onAction={async () => {
                if (isPinned) {
                  await removePin(r.id);
                  await showToast({ style: Toast.Style.Success, title: "Unpinned Model" });
                } else {
                  await addPin(r.id);
                  await showToast({ style: Toast.Style.Success, title: "Pinned Model" });
                }
              }}
            />
            <Action
              title="Switch to Search"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => setMode("search")}
            />
            <ActionPanel.Submenu
              title="Change Leaderboard…"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            >
              <ActionPanel.Section title="Pick Leaderboard Metric">
                {METRICS.map((opt) => (
                  <Action
                    key={opt.key}
                    title={opt.label}
                    icon={Icon.Dot}
                    onAction={() => setMetric(opt.key as MetricKey)}
                  />
                ))}
              </ActionPanel.Section>
            </ActionPanel.Submenu>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
          </ActionPanel>
        }
      />
    );
  };

  // Merge immediate pinned from current leaderboard slice (no fetch delay) with fetched pinned records
  const pinnedFromSlice = rows.filter((r) => pinnedIds.includes(r.id));
  const mergedPinned = new Map<string, Model>();
  pinnedFromSlice.forEach((m) => mergedPinned.set(m.id, m as unknown as Model));
  pinnedModels.forEach((m) => {
    if (pinnedIds.includes(m.id) && !mergedPinned.has(m.id)) {
      mergedPinned.set(m.id, m as unknown as Model);
    }
  });
  const pinnedRows = Array.from(mergedPinned.values()).sort((a, b) => {
    const av = (a as unknown as Record<string, number | null>)[metric];
    const bv = (b as unknown as Record<string, number | null>)[metric];
    const aMissing = av == null || av === 0;
    const bMissing = bv == null || bv === 0;
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1; // push a to bottom
    if (bMissing) return -1; // push b to bottom
    return METRIC_ASC[metric] ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
  // Filter main rows for current metric to avoid flashing in 'no data' entries while new metric loads
  const rowsForMetric = rows.filter((r) => {
    const v = (r as unknown as Record<string, number | null>)[metric];
    return v != null && v !== 0;
  });
  const { unpinned: listRows } = splitPinned(rowsForMetric, pinnedIds);
  // Build rank map from the full (unfiltered) metric-eligible rows returned by the query
  const rankById = useMemo(() => new Map<string, number>(rowsForMetric.map((r, i) => [r.id, i + 1])), [rowsForMetric]);
  // Lightweight text filter for leaderboard search
  const q = searchText.trim().toLowerCase();
  const matches = (r: Model) => {
    if (!q) return true;
    const name = (r.name ?? "").toLowerCase();
    const slug = (r.slug ?? "").toLowerCase();
    const creator = (r.creator_name ?? "").toLowerCase();
    return name.includes(q) || slug.includes(q) || creator.includes(q);
  };
  const pinnedRowsFiltered = pinnedRows.filter(matches);
  const listRowsFiltered = listRows.filter(matches);
  const showSkeleton = showSkel;
  const showPinnedSkeleton = showPinnedSkel;

  // Delay show spinner/skeleton to avoid flicker when data is immediately available
  useEffect(() => {
    const shouldShow = isLoading && rowsForMetric.length === 0 && pinnedRows.length === 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (shouldShow) {
      t = setTimeout(() => {
        onLoadingChange(true);
        setShowSkel(true);
      }, 120);
    } else {
      onLoadingChange(false);
      setShowSkel(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [isLoading, rowsForMetric.length, pinnedRows.length, onLoadingChange]);

  // Delay pinned skeletons as well to avoid brief flashes on quick cache hits
  useEffect(() => {
    const shouldShowPinned = pinnedLoading && pinnedRows.length === 0 && pinnedIds.length > 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (shouldShowPinned) {
      t = setTimeout(() => setShowPinnedSkel(true), 120);
    } else {
      setShowPinnedSkel(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [pinnedLoading, pinnedRows.length, pinnedIds.length]);

  return (
    <>
      {/* Loading state handled by parent List's isLoading spinner to avoid empty-state flicker */}
      {showSkeleton && (
        <List.Section title="Loading…">
          {Array.from({ length: 6 }).map((_, i) => (
            <List.Item
              key={`skeleton-${i}`}
              title="Loading…"
              subtitle=""
              accessories={[{ tag: { value: "…", color: Color.SecondaryText } }]}
              icon={Icon.Circle}
            />
          ))}
        </List.Section>
      )}
      {showPinnedSkeleton && (
        <List.Section title="Pinned">
          {Array.from({ length: Math.min(6, pinnedIds.length) }).map((_, i) => (
            <List.Item
              key={`pinned-skeleton-${i}`}
              title="Loading…"
              subtitle=""
              accessories={[{ tag: { value: "…", color: Color.SecondaryText } }]}
              icon={Icon.Circle}
            />
          ))}
        </List.Section>
      )}
      {pinnedRowsFiltered.length > 0 && (
        <List.Section title="Pinned">{pinnedRowsFiltered.map((r) => renderItem(r as unknown as Model))}</List.Section>
      )}
      <List.Section title={`Top by ${metric}`} subtitle={isAsc ? "ascending" : "descending"}>
        {listRowsFiltered.map((r) => renderItem(r as unknown as Model))}
      </List.Section>
    </>
  );
}

type CreatorFilterDropdownProps = { value: string; onChange: (v: string) => void | Promise<void> };

function CreatorFilterDropdown({ value, onChange }: CreatorFilterDropdownProps) {
  const [creators, setCreators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const client = sb();
        // Fetch creator names; de-duplicate client-side (distinct option isn't typed in supabase-js)
        const { data, error } = await client
          .from("aa_models")
          .select("creator_name")
          .not("creator_name", "is", null)
          .order("creator_name", { ascending: true });
        if (error) throw error;
        const names = Array.from(
          new Set(
            ((data ?? []) as { creator_name: string | null }[])
              .map((d) => d.creator_name)
              .filter((v): v is string => Boolean(v)),
          ),
        );
        setCreators(names);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <List.Dropdown tooltip="Filter by Creator" storeValue value={value} onChange={onChange} isLoading={loading}>
      <List.Dropdown.Item title="All Creators" value="" />
      {creators.map((c) => (
        <List.Dropdown.Item key={c} title={c} value={c} />
      ))}
    </List.Dropdown>
  );
}

function buildModelMarkdown(model: Model) {
  const priceInput = !isMissing(model.price_1m_input_tokens)
    ? formatPrice(model.price_1m_input_tokens as number)
    : "N/A";
  const priceOutput = !isMissing(model.price_1m_output_tokens)
    ? formatPrice(model.price_1m_output_tokens as number)
    : "N/A";
  const priceBlended = !isMissing(model.price_1m_blended_3_to_1)
    ? formatPrice(model.price_1m_blended_3_to_1 as number)
    : "N/A";
  const tps = !isMissing(model.median_output_tokens_per_second) ? String(model.median_output_tokens_per_second) : "N/A";
  const ttft = !isMissing(model.median_time_to_first_token_seconds)
    ? String(model.median_time_to_first_token_seconds)
    : "N/A";
  const updatedAgo = timeAgo(model.last_seen);

  const overview = `
| Field | Value |
|------:|:------|
| Name | ${na(model.name ?? model.slug)} |
| Slug | ${na(model.slug)} |
| Creator | ${na(model.creator_name)} (${na(model.creator_slug)}) |
| First Seen | ${na(model.first_seen)} |
| Last Seen | ${na(model.last_seen)} (${updatedAgo}) |
`;

  const pricingTbl = `
| Pricing | USD |
|-------:|:----|
| Input (1M) | ${priceInput} |
| Output (1M) | ${priceOutput} |
| Blended 3:1 (1M) | ${priceBlended} |
`;

  const benchmarks = `
| Benchmark | Score |
|---------:|:------|
| Intelligence Index | ${na(model.aa_intelligence_index)} |
| Coding Index | ${na(model.aa_coding_index)} |
| Math Index | ${na(model.aa_math_index)} |
| MMLU Pro | ${na(model.mmlu_pro)} |
| GPQA | ${na(model.gpqa)} |
| LiveCodeBench | ${na(model.livecodebench)} |
| SciCode | ${na(model.scicode)} |
| Math 500 | ${na(model.math_500)} |
| AIME | ${na(model.aime)} |
| HLE | ${na(model.hle)} |
`;

  const throughputTbl = `
| Metric | Value |
|------:|:------|
| Median Tokens/sec | ${tps} |
| Median TTFT (s) | ${ttft} |
`;

  const full = `# ${model.name ?? model.slug ?? "Model"}

## Overview
${overview}

## Pricing
${pricingTbl}

## Throughput & Latency
${throughputTbl}

## Benchmarks
${benchmarks}

## Raw Data
### Pricing JSON
${fencedJson(model.pricing ?? {})}

### Evaluations JSON
${fencedJson(model.evaluations ?? {})}
`;

  return { overview, pricingTbl, throughputTbl, benchmarks, full };
}

function modelMarkdown(model: Model) {
  return buildModelMarkdown(model).full;
}

function fencedJson(val: unknown) {
  return `\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\`\n`;
}

type ModelDetailProps = {
  model: Model;
  pinnedIds?: string[];
  addPin?: (id: string) => void | Promise<void>;
  removePin?: (id: string) => void | Promise<void>;
};

function ModelDetail({ model, pinnedIds, addPin, removePin }: ModelDetailProps) {
  // Always fetch full model when detail opens (leaderboard rows only have a subset of columns)
  const { data: fullRows = [] } = useCachedPromise(
    async (id: string) => {
      const client = sb();
      const { data, error } = await client.from("aa_models").select(MODEL_FULL_COLUMNS).eq("id", id).limit(1);
      if (error) throw error;
      return (data ?? []) as unknown as Model[];
    },
    [model.id],
    { keepPreviousData: true },
  );
  const displayModel = (fullRows?.[0] as Model) ?? model;
  const md = modelMarkdown(displayModel);
  // Subscribe to local storage so Detail reacts immediately to pin/unpin changes
  const { value: lsPinnedIds = [], setValue: setLsPinnedIds } = useLocalStorage<string[]>("ai-stats-pinned-ids", []);
  const isPinnedExternal = pinnedIds?.includes(displayModel.id) ?? false;
  const isPinned = (lsPinnedIds ?? []).includes(displayModel.id) || isPinnedExternal;
  const { pop } = useNavigation();
  const { AFTER_PIN_BEHAVIOR = "return_to_list" } = getPreferenceValues<{
    AFTER_PIN_BEHAVIOR?: "return_to_list" | "stay_on_detail";
  }>();

  const togglePin = async () => {
    const current = (lsPinnedIds ?? []).filter(Boolean);
    if (isPinned) {
      // Unpin
      if (removePin) await removePin(displayModel.id);
      else await setLsPinnedIds(current.filter((id) => id !== displayModel.id));
      await showToast({ style: Toast.Style.Success, title: "Unpinned Model" });
    } else {
      // Pin (keep max 10, de-duped)
      const next = [displayModel.id, ...current.filter((id) => id !== displayModel.id)].slice(0, 10);
      if (addPin) await addPin(displayModel.id);
      else await setLsPinnedIds(next);
      await showToast({ style: Toast.Style.Success, title: "Pinned Model" });
    }
    // After toggling, optionally return to the list view per preference
    if (AFTER_PIN_BEHAVIOR === "return_to_list") {
      try {
        pop();
      } catch {
        // no-op if navigation stack cannot pop
      }
    }
  };
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title={isPinned ? "Unpin Model" : "Pin Model"}
            icon={isPinned ? Icon.PinDisabled : Icon.Pin}
            onAction={() => void togglePin()}
          />
          <ActionPanel.Submenu title="Copy Info" icon={Icon.Clipboard}>
            {(() => {
              const name = displayModel.name ?? displayModel.slug ?? "Model";
              const overviewText = `Name: ${na(displayModel.name ?? displayModel.slug)}\nSlug: ${na(displayModel.slug)}\nCreator: ${na(displayModel.creator_name)} (${na(displayModel.creator_slug)})\nFirst Seen: ${na(displayModel.first_seen)}\nLast Seen: ${na(displayModel.last_seen)} (${timeAgo(displayModel.last_seen)})`;
              const pricingText = `Input (1M): ${!isMissing(displayModel.price_1m_input_tokens) ? formatPrice(displayModel.price_1m_input_tokens as number) : "N/A"}\nOutput (1M): ${!isMissing(displayModel.price_1m_output_tokens) ? formatPrice(displayModel.price_1m_output_tokens as number) : "N/A"}\nBlended 3:1 (1M): ${!isMissing(displayModel.price_1m_blended_3_to_1) ? formatPrice(displayModel.price_1m_blended_3_to_1 as number) : "N/A"}`;
              const throughputText = `Median Tokens/sec: ${!isMissing(displayModel.median_output_tokens_per_second) ? String(displayModel.median_output_tokens_per_second) : "N/A"}\nMedian TTFT (s): ${!isMissing(displayModel.median_time_to_first_token_seconds) ? String(displayModel.median_time_to_first_token_seconds) : "N/A"}`;
              const benchmarksText = `Intelligence Index: ${na(displayModel.aa_intelligence_index)}\nCoding Index: ${na(displayModel.aa_coding_index)}\nMath Index: ${na(displayModel.aa_math_index)}\nMMLU Pro: ${na(displayModel.mmlu_pro)}\nGPQA: ${na(displayModel.gpqa)}\nLiveCodeBench: ${na(displayModel.livecodebench)}\nSciCode: ${na(displayModel.scicode)}\nMath 500: ${na(displayModel.math_500)}\nAIME: ${na(displayModel.aime)}\nHLE: ${na(displayModel.hle)}`;
              const fullText = `${name}\n\nOverview\n${overviewText}\n\nPricing\n${pricingText}\n\nThroughput & Latency\n${throughputText}\n\nBenchmarks\n${benchmarksText}`;
              return (
                <>
                  <Action.CopyToClipboard title="Copy Overview" icon={Icon.Clipboard} content={overviewText} />
                  <Action.CopyToClipboard title="Copy Pricing" icon={Icon.Clipboard} content={pricingText} />
                  <Action.CopyToClipboard title="Copy Throughput" icon={Icon.Clipboard} content={throughputText} />
                  <Action.CopyToClipboard title="Copy Benchmarks" icon={Icon.Clipboard} content={benchmarksText} />
                  <Action.CopyToClipboard title="Copy All" icon={Icon.Clipboard} content={fullText} />
                </>
              );
            })()}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}

function formatPrice(n: number) {
  // formats 0.15 -> $0.15, 12 -> $12
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(n);
  } catch {
    return `$${n}`;
  }
}

function accessoriesForModel(m: Model, isPinned: boolean): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [];
  if (isPinned) acc.push({ tag: { value: "Pinned", color: Color.Purple } });

  if (m.price_1m_input_tokens != null && m.price_1m_input_tokens !== 0) {
    acc.push({ tag: { value: `${formatPrice(m.price_1m_input_tokens)}/1M in`, color: Color.Orange } });
  } else {
    acc.push({ tag: { value: `N/A in`, color: Color.SecondaryText } });
  }

  if (m.price_1m_output_tokens != null && m.price_1m_output_tokens !== 0) {
    acc.push({ tag: { value: `${formatPrice(m.price_1m_output_tokens)}/1M out`, color: Color.Red } });
  } else {
    acc.push({ tag: { value: `N/A out`, color: Color.SecondaryText } });
  }

  if (m.median_output_tokens_per_second != null && m.median_output_tokens_per_second !== 0) {
    acc.push({ tag: { value: `${m.median_output_tokens_per_second} tps`, color: Color.Green } });
  } else {
    acc.push({ tag: { value: `N/A tps`, color: Color.SecondaryText } });
  }

  return acc;
}

function colorForMetric(metric: MetricKey): Color {
  if (metric === "median_output_tokens_per_second") return Color.Green;
  if (metric === "price_1m_output_tokens") return Color.Red;
  if (metric === "price_1m_input_tokens" || metric === "price_1m_blended_3_to_1") return Color.Orange;
  if (metric === "median_time_to_first_token_seconds") return Color.Orange;
  return Color.Yellow; // default for score metrics (gold)
}

function formatMetricValue(metric: MetricKey, value: number): string {
  if (metric.startsWith("price_1m_")) return `${formatPrice(value)}`;
  if (metric === "median_output_tokens_per_second") return `${value} tps`;
  if (metric === "median_time_to_first_token_seconds") return `${value} s`;
  return String(value);
}
