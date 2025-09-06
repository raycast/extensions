import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import { sb } from "./lib/supabase";
import type { Model } from "./lib/types";

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

type MetricKey = (typeof METRICS)[number]["key"];

function isMissing(v: number | null | undefined): boolean {
  return v == null || v === 0;
}

function na(v: number | string | null | undefined): string {
  if (typeof v === "number") return isMissing(v) ? "N/A" : String(v);
  return v == null || v === "" ? "N/A" : String(v);
}

export default function View() {
  const { SHOW_PINNED_SECTION = true } = getPreferenceValues<{ SHOW_PINNED_SECTION?: boolean }>();
  const { value: mode = "search", setValue: setMode } = useLocalStorage<Mode>("ai-stats-mode", "search");
  const { value: metric = "mmlu_pro", setValue: setMetric } = useLocalStorage<MetricKey>("ai-stats-metric", "mmlu_pro");
  const [searchText, setSearchText] = useState<string>("");
  const { value: creatorFilter = "", setValue: setCreatorFilter } = useLocalStorage<string>("ai-stats-creator", "");
  const { value: pinnedIds = [], setValue: setPinnedIds } = useLocalStorage<string[]>("ai-stats-pinned-ids", []);

  function addPin(id: string) {
    const next = [id, ...pinnedIds.filter((x) => x !== id)].slice(0, 10);
    return setPinnedIds(next);
  }
  function removePin(id: string) {
    const next = pinnedIds.filter((x) => x !== id);
    return setPinnedIds(next);
  }
  function movePin(id: string, delta: number) {
    const idx = pinnedIds.indexOf(id);
    if (idx === -1) return;
    const next = pinnedIds.slice();
    const newIdx = Math.max(0, Math.min(next.length - 1, idx + delta));
    next.splice(idx, 1);
    next.splice(newIdx, 0, id);
    setPinnedIds(next);
  }

  return (
    <List
      searchBarPlaceholder={
        mode === "search"
          ? "Search models by name, slug, or creator…"
          : "Search is disabled in Leaderboards. Use the Metric menu to change leaderboard."
      }
      onSearchTextChange={(t) => setSearchText(t)}
      searchText={searchText}
      searchBarAccessory={
        <>
          <List.Dropdown tooltip="Mode" onChange={(v) => setMode(v as Mode)} storeValue>
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
          showPinnedSection={Boolean(SHOW_PINNED_SECTION)}
        />
      ) : (
        <LeaderboardSection metric={metric} setMode={setMode} setMetric={setMetric} />
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
  showPinnedSection: boolean;
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
  showPinnedSection,
}: SearchSectionProps) {
  const [q, setQ] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [rows, setRows] = useState<Model[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectColumns = useMemo(
    () =>
      `
      id,name,slug,creator_name,creator_slug,
      aa_intelligence_index,aa_coding_index,aa_math_index,
      mmlu_pro,gpqa,livecodebench,scicode,math_500,aime,hle,
      median_output_tokens_per_second,median_time_to_first_token_seconds,
      price_1m_input_tokens,price_1m_output_tokens,price_1m_blended_3_to_1,
      pricing,evaluations,first_seen,last_seen
    `.replace(/\s+/g, " "),
    [],
  );

  async function load(query: string) {
    try {
      setLoading(true);
      const client = sb();
      let base = client.from("aa_models").select(selectColumns).limit(100);
      if (query) {
        base = base.or(`name.ilike.*${query}*,slug.ilike.*${query}*,creator_name.ilike.*${query}*`);
      }
      if (creatorFilter) {
        base = base.eq("creator_name", creatorFilter);
      }
      base = base.order("last_seen", { ascending: false });
      const { data, error } = await base;
      if (error) throw error;
      setRows((data ?? []) as unknown as Model[]);
    } catch (e: unknown) {
      console.error(e);
      let message = "Unknown error";
      if (e && typeof e === "object" && "message" in e) {
        const m = (e as { message?: unknown }).message;
        message = typeof m === "string" ? m : JSON.stringify(m);
      }
      void showToast({ style: Toast.Style.Failure, title: "Failed to load models", message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  // React to parent search text or creator filter changes
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setQ(searchText);
    debounce.current = setTimeout(() => void load(searchText), 250);
  }, [searchText, creatorFilter]);

  const pinnedRows = rows
    .filter((r) => pinnedIds.includes(r.id))
    .sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
  const listRows = rows.filter((r) => !pinnedIds.includes(r.id));
  const updatedLabel = rows.length > 0 && rows[0]?.last_seen ? `Updated ${timeAgo(rows[0].last_seen)}` : undefined;

  return (
    <>
      {isLoading && rows.length === 0 ? <List.EmptyView title="Loading…" /> : null}
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
                    void load("");
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
      {showPinnedSection && pinnedRows.length > 0 && (
        <List.Section title="Pinned">
          {pinnedRows.map((m) => {
            const accessories: List.Item.Accessory[] = [];
            accessories.push({ tag: { value: "Pinned", color: Color.Yellow } });
            if (m.price_1m_input_tokens != null && m.price_1m_input_tokens !== 0) {
              accessories.push({ tag: { value: `${formatPrice(m.price_1m_input_tokens)}/1M in`, color: Color.Red } });
            } else {
              accessories.push({ tag: { value: `N/A in`, color: Color.SecondaryText } });
            }
            if (m.price_1m_output_tokens != null && m.price_1m_output_tokens !== 0) {
              accessories.push({ tag: { value: `${formatPrice(m.price_1m_output_tokens)}/1M out`, color: Color.Red } });
            } else {
              accessories.push({ tag: { value: `N/A out`, color: Color.SecondaryText } });
            }
            if (m.median_output_tokens_per_second != null && m.median_output_tokens_per_second !== 0) {
              accessories.push({ tag: { value: `${m.median_output_tokens_per_second} tps`, color: Color.Orange } });
            } else {
              accessories.push({ tag: { value: `N/A tps`, color: Color.SecondaryText } });
            }
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
                    <Action title="Unpin Model" icon={Icon.PinDisabled} onAction={() => removePin(m.id)} />
                    <Action title="Move Pin up" icon={Icon.ArrowUp} onAction={() => movePin(m.id, -1)} />
                    <Action title="Move Pin Down" icon={Icon.ArrowDown} onAction={() => movePin(m.id, 1)} />
                    <Action title="Switch to Leaderboards" icon={Icon.List} onAction={() => setMode("leaderboards")} />
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
                        void load("");
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
          const accessories: List.Item.Accessory[] = [];
          const isPinned = pinnedIds.includes(m.id);
          if (isPinned) accessories.push({ tag: { value: "Pinned", color: Color.Yellow } });
          if (m.price_1m_input_tokens != null && m.price_1m_input_tokens !== 0) {
            accessories.push({ tag: { value: `${formatPrice(m.price_1m_input_tokens)}/1M in`, color: Color.Red } });
          } else {
            accessories.push({ tag: { value: `N/A in`, color: Color.SecondaryText } });
          }
          if (m.price_1m_output_tokens != null && m.price_1m_output_tokens !== 0) {
            accessories.push({ tag: { value: `${formatPrice(m.price_1m_output_tokens)}/1M out`, color: Color.Red } });
          } else {
            accessories.push({ tag: { value: `N/A out`, color: Color.SecondaryText } });
          }
          if (m.median_output_tokens_per_second != null && m.median_output_tokens_per_second !== 0) {
            accessories.push({ tag: { value: `${m.median_output_tokens_per_second} tps`, color: Color.Orange } });
          } else {
            accessories.push({ tag: { value: `N/A tps`, color: Color.SecondaryText } });
          }
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
                  <Action title="Switch to Leaderboards" icon={Icon.List} onAction={() => setMode("leaderboards")} />
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
                      void load("");
                    }}
                  />
                  {isPinned ? (
                    <Action title="Unpin Model" icon={Icon.PinDisabled} onAction={() => removePin(m.id)} />
                  ) : (
                    <Action title="Pin Model" icon={Icon.Pin} onAction={() => addPin(m.id)} />
                  )}
                  {isPinned && (
                    <>
                      <Action title="Move Pin up" icon={Icon.ArrowUp} onAction={() => movePin(m.id, -1)} />
                      <Action title="Move Pin Down" icon={Icon.ArrowDown} onAction={() => movePin(m.id, 1)} />
                    </>
                  )}
                  <Action.CopyToClipboard title="Copy Name" icon={Icon.Clipboard} content={m.name ?? ""} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void load(q)} />
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
};

function LeaderboardSection({ metric, setMode, setMetric }: LeaderboardSectionProps) {
  const [rows, setRows] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState(true);

  const isAsc = useMemo(() => metric === "median_time_to_first_token_seconds" || metric.startsWith("price_"), [metric]);

  async function load() {
    setLoading(true);
    const client = sb();
    const columns = `id,name,slug,creator_name,${metric}`;
    const { data, error } = await client
      .from("aa_models")
      .select(columns)
      .not(metric, "is", null)
      .order(metric, { ascending: isAsc })
      .limit(50);
    if (error) {
      console.error(error);
      setRows([]);
      const message = typeof error.message === "string" ? error.message : JSON.stringify(error);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load leaderboard", message });
    } else {
      setRows((data ?? []) as unknown as Model[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [metric]);

  return (
    <>
      {isLoading && rows.length === 0 ? <List.EmptyView title="Loading…" /> : null}
      <List.Section title={`Top by ${metric}`} subtitle={isAsc ? "ascending" : "descending"}>
        {rows.map((r) => {
          const accessories: List.Item.Accessory[] = [];
          // Removed slug accessory to avoid redundancy with title
          const value = (r as unknown as Record<string, number | null>)[metric];
          if (value != null && value !== 0) {
            accessories.push({ tag: { value: String(value), color: isAsc ? Color.Orange : Color.Red } });
          } else {
            accessories.push({ tag: { value: "N/A", color: Color.SecondaryText } });
          }
          return (
            <List.Item
              key={r.id}
              title={r.name ?? r.slug ?? "Model"}
              subtitle={r.creator_name ?? ""}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Details"
                    icon={Icon.Sidebar}
                    target={<ModelDetail model={r as unknown as Model} />}
                  />
                  <Action title="Switch to Search" icon={Icon.MagnifyingGlass} onAction={() => setMode("search")} />
                  <ActionPanel.Submenu
                    title="Change Leaderboard…"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "k" }}
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
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void load()} />
                </ActionPanel>
              }
            />
          );
        })}
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
  const md = modelMarkdown(model);
  const isPinned = pinnedIds?.includes(model.id) ?? false;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          {addPin &&
            removePin &&
            (isPinned ? (
              <Action title="Unpin Model" icon={Icon.PinDisabled} onAction={() => removePin(model.id)} />
            ) : (
              <Action title="Pin Model" icon={Icon.Pin} onAction={() => addPin(model.id)} />
            ))}
          <ActionPanel.Submenu title="Copy Info" icon={Icon.Clipboard}>
            {(() => {
              const name = model.name ?? model.slug ?? "Model";
              const overviewText = `Name: ${na(model.name ?? model.slug)}\nSlug: ${na(model.slug)}\nCreator: ${na(model.creator_name)} (${na(model.creator_slug)})\nFirst Seen: ${na(model.first_seen)}\nLast Seen: ${na(model.last_seen)} (${timeAgo(model.last_seen)})`;
              const pricingText = `Input (1M): ${!isMissing(model.price_1m_input_tokens) ? formatPrice(model.price_1m_input_tokens as number) : "N/A"}\nOutput (1M): ${!isMissing(model.price_1m_output_tokens) ? formatPrice(model.price_1m_output_tokens as number) : "N/A"}\nBlended 3:1 (1M): ${!isMissing(model.price_1m_blended_3_to_1) ? formatPrice(model.price_1m_blended_3_to_1 as number) : "N/A"}`;
              const throughputText = `Median Tokens/sec: ${!isMissing(model.median_output_tokens_per_second) ? String(model.median_output_tokens_per_second) : "N/A"}\nMedian TTFT (s): ${!isMissing(model.median_time_to_first_token_seconds) ? String(model.median_time_to_first_token_seconds) : "N/A"}`;
              const benchmarksText = `Intelligence Index: ${na(model.aa_intelligence_index)}\nCoding Index: ${na(model.aa_coding_index)}\nMath Index: ${na(model.aa_math_index)}\nMMLU Pro: ${na(model.mmlu_pro)}\nGPQA: ${na(model.gpqa)}\nLiveCodeBench: ${na(model.livecodebench)}\nSciCode: ${na(model.scicode)}\nMath 500: ${na(model.math_500)}\nAIME: ${na(model.aime)}\nHLE: ${na(model.hle)}`;
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
