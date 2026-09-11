import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MakeClient, presentMakeApiError } from "./make-api";
import { toScenarioEditUrl } from "./make-browser-url";
import { ScenarioDetail } from "./scenario-detail";
import { SelectOrgTeam } from "./select-org-team";
import {
  addFavorite,
  clearSelection,
  getFavorites,
  getSelection,
  isFavorite,
  removeFavorite,
  setSelection as setStoredSelection,
} from "./storage";
import type {
  GetOrganizationResponse,
  GetScenarioResponse,
  ListScenariosResponse,
  ListScenarioConsumptionsResponse,
  MakeScenario,
  ScenarioConsumption,
} from "./types";

type StatusFilter = "all" | "live" | "disabled";

type SortMode = "ops" | "name" | "lastEdit";

const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;
const RATE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SCENARIOS_PAGE_SIZE = 200;
const MAX_SCENARIOS_PAGES = 200; // safety: up to 40k scenarios

function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    n,
  );
}

function safeParseDateMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function addMonths(ms: number, months: number): number {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

function addYears(ms: number, years: number): number {
  const d = new Date(ms);
  d.setFullYear(d.getFullYear() + years);
  return d.getTime();
}

function computeTrendText(opts: {
  operationsLimit: number | null;
  totalOpsUsed: number | null;
  resetInDays: number | null;
  avgDailyOps: number | null;
}): string | null {
  const { operationsLimit, totalOpsUsed, resetInDays, avgDailyOps } = opts;
  if (
    typeof operationsLimit !== "number" ||
    typeof totalOpsUsed !== "number" ||
    typeof resetInDays !== "number" ||
    typeof avgDailyOps !== "number"
  ) {
    return null;
  }

  const opsLeft = Math.max(0, operationsLimit - totalOpsUsed);
  const daysLeft = Math.max(0, resetInDays);
  if (daysLeft === 0) return null;

  const requiredAvg = opsLeft / daysLeft;
  const delta = avgDailyOps - requiredAvg;

  // Avoid flip-flopping near the boundary.
  const TOLERANCE = 0.05; // 5%
  const over = avgDailyOps > requiredAvg * (1 + TOLERANCE);

  if (!Number.isFinite(requiredAvg) || requiredAvg <= 0) {
    return over ? "Trend: OVER" : "Trend: ON TRACK";
  }

  const deltaPerDay = Math.round(Math.abs(delta));
  return over
    ? `Trend: OVER by ${formatInt(deltaPerDay)}/day`
    : `Trend: ON TRACK (≈${formatInt(Math.round(requiredAvg))}/day)`;
}

export default function ListScenariosCommand() {
  const prefs = getPreferenceValues<Preferences.ListScenarios>();
  const client = useMemo(
    () => new MakeClient({ baseUrl: prefs.baseUrl, apiToken: prefs.apiToken }),
    [prefs.baseUrl, prefs.apiToken],
  );

  const [selectionKey, setSelectionKey] = useState(0);
  const [selection, setSelectionState] =
    useState<Awaited<ReturnType<typeof getSelection>>>(null);
  const [isLoadingSelection, setIsLoadingSelection] = useState(true);

  const [favorites, setFavorites] = useState<number[]>([]);

  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [scenarios, setScenarios] = useState<MakeScenario[]>([]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("live");
  const [sortMode, setSortMode] = useState<SortMode>("ops");

  const [consumptionsByScenarioId, setConsumptionsByScenarioId] = useState<
    Record<number, ScenarioConsumption>
  >({});
  const [lastReset, setLastReset] = useState<string | null>(null);
  const [operationsLimit, setOperationsLimit] = useState<number | null>(null);
  const [restartPeriod, setRestartPeriod] = useState<string | null>(null);
  const [totalOpsUsed, setTotalOpsUsed] = useState<number | null>(null);
  const [avgDailyOps, setAvgDailyOps] = useState<number | null>(null);
  const [resetInDays, setResetInDays] = useState<number | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSelection() {
      setIsLoadingSelection(true);
      try {
        const [sel, favs] = await Promise.all([getSelection(), getFavorites()]);
        if (!cancelled) {
          setSelectionState(sel);
          setFavorites(favs);
        }
      } finally {
        if (!cancelled) setIsLoadingSelection(false);
      }
    }

    void loadSelection();

    return () => {
      cancelled = true;
    };
  }, [selectionKey]);

  useEffect(() => {
    let cancelled = false;

    async function ensureRateLimitConfigured(
      sel: NonNullable<typeof selection>,
    ) {
      client.setRateLimitPerMinute(DEFAULT_RATE_LIMIT_PER_MINUTE);

      const cachedLimit = sel.apiLimitPerMinute;
      const cachedAt = sel.apiLimitFetchedAtMs;
      if (
        typeof cachedLimit === "number" &&
        typeof cachedAt === "number" &&
        Date.now() - cachedAt < RATE_LIMIT_TTL_MS
      ) {
        client.setRateLimitPerMinute(cachedLimit);
        return;
      }

      try {
        const res = await client.getJson<GetOrganizationResponse>(
          `/api/v2/organizations/${sel.organizationId}`,
        );
        const apiLimit = res.organization?.license?.apiLimit;
        const opsLimit = res.organization?.license?.operations;
        const period = res.organization?.license?.restartPeriod;

        const updated = {
          ...sel,
          apiLimitPerMinute:
            typeof apiLimit === "number" && apiLimit > 0
              ? apiLimit
              : sel.apiLimitPerMinute,
          apiLimitFetchedAtMs: Date.now(),
          operationsLimit:
            typeof opsLimit === "number" ? opsLimit : sel.operationsLimit,
          restartPeriod:
            typeof period === "string" ? period : sel.restartPeriod,
        };

        if (
          typeof updated.apiLimitPerMinute === "number" &&
          updated.apiLimitPerMinute > 0
        ) {
          client.setRateLimitPerMinute(updated.apiLimitPerMinute);
        }

        await setStoredSelection(updated);
        if (!cancelled) {
          setSelectionState(updated);
          setOperationsLimit(
            typeof updated.operationsLimit === "number"
              ? updated.operationsLimit
              : null,
          );
          setRestartPeriod(
            typeof updated.restartPeriod === "string"
              ? updated.restartPeriod
              : null,
          );
        }
      } catch {
        // keep default
      }
    }

    async function fetchAll(opts?: { silent?: boolean }) {
      if (!selection) return;
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      if (!opts?.silent) {
        setIsLoadingScenarios(true);
        setScenarios([]);
        setConsumptionsByScenarioId({});
        setLastReset(null);
        setTotalOpsUsed(null);
        setAvgDailyOps(null);
        setResetInDays(null);
      }

      try {
        // Configure rate limiting *in the background*; don't block first paint.
        void ensureRateLimitConfigured(selection);

        // Fast-path: fetch favorite scenarios individually so the Favorites
        // section renders before the full paginated list arrives.
        if (favorites.length > 0) {
          const favResults = await Promise.allSettled(
            favorites.map((id) =>
              client.getJson<GetScenarioResponse>(`/api/v2/scenarios/${id}`),
            ),
          );
          if (cancelled) return;
          const favScenarios: MakeScenario[] = [];
          for (const r of favResults) {
            if (r.status === "fulfilled" && r.value.scenario) {
              favScenarios.push(r.value.scenario);
            }
          }
          if (favScenarios.length > 0) {
            setScenarios(favScenarios);
          }
        }

        const cols = [
          "id",
          "name",
          "teamId",
          "description",
          "isinvalid",
          "isActive",
          "islocked",
          "isPaused",
          "usedPackages",
          "lastEdit",
          "scheduling",
          "dlqCount",
          "createdByUser",
          "updatedByUser",
          "nextExec",
          "created",
        ] as const;

        // Fetch the first page so the list appears quickly, then page through.
        const first = await client.getJson<ListScenariosResponse>(
          "/api/v2/scenarios",
          {
            teamId: selection.teamId,
            "pg[limit]": SCENARIOS_PAGE_SIZE,
            "pg[offset]": 0,
            "pg[sortBy]": "id",
            "pg[sortDir]": "desc",
            "cols[]": [...cols],
          },
        );

        if (cancelled) return;
        const firstItems = first.scenarios ?? [];
        setScenarios(firstItems);

        // Load remaining pages in the background (still within this refresh).
        let offset = firstItems.length;
        let page = 1;
        let lastPageSize = firstItems.length;
        while (
          lastPageSize >= SCENARIOS_PAGE_SIZE &&
          page < MAX_SCENARIOS_PAGES
        ) {
          const res = await client.getJson<ListScenariosResponse>(
            "/api/v2/scenarios",
            {
              teamId: selection.teamId,
              "pg[limit]": SCENARIOS_PAGE_SIZE,
              "pg[offset]": offset,
              "pg[sortBy]": "id",
              "pg[sortDir]": "desc",
              "cols[]": [...cols],
            },
          );

          if (cancelled) return;
          const items = res.scenarios ?? [];
          if (!items.length) break;
          setScenarios((prev) => [...prev, ...items]);
          lastPageSize = items.length;
          if (lastPageSize < SCENARIOS_PAGE_SIZE) break;
          offset += items.length;
          page += 1;
        }

        // Then hydrate consumptions (ops) without blocking scenario render.
        const consumptions =
          await client.getJson<ListScenarioConsumptionsResponse>(
            "/api/v2/scenarios/consumptions",
            { teamId: selection.teamId },
          );

        if (cancelled) return;
        const map: Record<number, ScenarioConsumption> = {};
        for (const c of consumptions.scenarioConsumptions ?? [])
          map[c.scenarioId] = c;
        setConsumptionsByScenarioId(map);
        const lr = consumptions.lastReset ?? null;
        setLastReset(lr);

        const totalOps = (consumptions.scenarioConsumptions ?? []).reduce(
          (sum, c) => sum + (c.operations ?? 0),
          0,
        );
        setTotalOpsUsed(totalOps);

        const lastResetMs = safeParseDateMs(lr);
        if (lastResetMs) {
          const now = Date.now();
          const elapsedDays = Math.max(
            1,
            Math.ceil((now - lastResetMs) / DAY_MS),
          );
          setAvgDailyOps(Math.round(totalOps / elapsedDays));

          const period = (
            restartPeriod ??
            selection.restartPeriod ??
            "monthly"
          ).toLowerCase();
          const nextResetMs =
            period === "annual"
              ? addYears(lastResetMs, 1)
              : addMonths(lastResetMs, 1);
          const remainingDays = Math.max(
            0,
            Math.ceil((nextResetMs - now) / DAY_MS),
          );
          setResetInDays(remainingDays);
        } else {
          setAvgDailyOps(null);
          setResetInDays(null);
        }
      } catch (e) {
        if (cancelled) return;
        if (!opts?.silent)
          await presentMakeApiError(e, "Failed to load scenarios");
      } finally {
        refreshInFlightRef.current = false;
        if (!cancelled && !opts?.silent) setIsLoadingScenarios(false);
      }
    }

    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [client, selection]);

  const { favoriteItems, otherItems } = useMemo(() => {
    const filtered = scenarios.filter((s) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "live") return s.isActive;
      return !s.isActive;
    });

    const withOps = filtered.map((s) => ({
      s,
      ops: consumptionsByScenarioId[s.id]?.operations,
    }));

    function sortItems(items: typeof withOps) {
      if (sortMode === "name") {
        return items.sort((a, b) => a.s.name.localeCompare(b.s.name));
      }
      if (sortMode === "lastEdit") {
        return items.sort((a, b) =>
          (b.s.lastEdit ?? "").localeCompare(a.s.lastEdit ?? ""),
        );
      }
      return items.sort((a, b) => {
        const ao = typeof a.ops === "number" ? a.ops : -1;
        const bo = typeof b.ops === "number" ? b.ops : -1;
        if (bo !== ao) return bo - ao;
        return a.s.name.localeCompare(b.s.name);
      });
    }

    const favs = withOps.filter((i) => isFavorite(i.s.id, favorites));
    const rest = withOps.filter((i) => !isFavorite(i.s.id, favorites));

    return { favoriteItems: sortItems(favs), otherItems: sortItems(rest) };
  }, [scenarios, consumptionsByScenarioId, statusFilter, sortMode, favorites]);

  async function toggleFavorite(id: number) {
    if (isFavorite(id, favorites)) {
      await removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f !== id));
    } else {
      await addFavorite(id);
      setFavorites((prev) => [...prev, id]);
    }
  }

  async function onChangeOrgTeam() {
    await clearSelection();
    setSelectionState(null);
    setSelectionKey((k) => k + 1);
  }

  if (isLoadingSelection) {
    return <List isLoading={true} />;
  }

  if (!selection) {
    return (
      <SelectOrgTeam
        client={client}
        onDone={() => setSelectionKey((k) => k + 1)}
      />
    );
  }

  const headerSummary = (() => {
    const parts: string[] = [];

    if (typeof resetInDays === "number") {
      parts.push(`Reset in: ${resetInDays}d`);
    }

    if (typeof totalOpsUsed === "number") {
      if (typeof operationsLimit === "number" && operationsLimit > 0) {
        parts.push(
          `Ops: ${formatInt(totalOpsUsed)}/${formatInt(operationsLimit)}`,
        );
      } else {
        parts.push(`Ops: ${formatInt(totalOpsUsed)}`);
      }
    }

    if (typeof avgDailyOps === "number") {
      parts.push(`Avg/day: ${formatInt(avgDailyOps)}`);
    }

    const trend = computeTrendText({
      operationsLimit,
      totalOpsUsed,
      resetInDays,
      avgDailyOps,
    });
    if (trend) parts.push(trend);

    return parts.length ? parts.join(" • ") : undefined;
  })();

  function renderScenarioItem(
    s: MakeScenario,
    ops: number | undefined,
    starred: boolean,
  ) {
    const opsText = typeof ops === "number" ? `${ops}` : "—";
    const statusText = s.isActive ? "Live" : "Disabled";
    const browserScenarioUrl = toScenarioEditUrl(
      prefs.baseUrl,
      selection!.teamId,
      s.id,
    );

    return (
      <List.Item
        key={s.id}
        title={s.name}
        subtitle={statusText}
        icon={s.isActive ? Icon.Play : Icon.Pause}
        accessories={[
          ...(starred ? [{ icon: Icon.Star }] : []),
          { text: opsText },
          ...(s.lastEdit ? [{ date: new Date(s.lastEdit) }] : []),
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              target={
                <ScenarioDetail
                  client={client}
                  baseUrl={prefs.baseUrl}
                  teamId={selection!.teamId}
                  scenarioId={s.id}
                  initialScenario={s}
                  consumptionOperations={typeof ops === "number" ? ops : null}
                  lastReset={lastReset}
                />
              }
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={browserScenarioUrl}
            />
            <Action
              title={starred ? "Remove from Favorites" : "Add to Favorites"}
              icon={starred ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => void toggleFavorite(s.id)}
            />
            <ActionPanel.Section>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => setSelectionKey((k) => k + 1)}
              />
              <ActionPanel.Submenu title="Sort" icon={Icon.ArrowUpCircle}>
                <Action
                  title="Operations Used"
                  onAction={() => setSortMode("ops")}
                />
                <Action title="Name" onAction={() => setSortMode("name")} />
                <Action
                  title="Last Edit"
                  onAction={() => setSortMode("lastEdit")}
                />
              </ActionPanel.Submenu>
              <Action
                title="Change Organization/team"
                icon={Icon.Switch}
                onAction={() => void onChangeOrgTeam()}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoadingScenarios}
      searchBarPlaceholder="Search scenarios…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Live" value="live" />
          <List.Dropdown.Item title="Disabled" value="disabled" />
        </List.Dropdown>
      }
    >
      {favoriteItems.length > 0 && (
        <List.Section
          title="Favorites"
          subtitle={`${favoriteItems.length} scenario${favoriteItems.length === 1 ? "" : "s"}`}
        >
          {favoriteItems.map(({ s, ops }) => renderScenarioItem(s, ops, true))}
        </List.Section>
      )}

      <List.Section
        title={`${selection.organizationName} → ${selection.teamName}`}
        subtitle={headerSummary}
      >
        {otherItems.map(({ s, ops }) => renderScenarioItem(s, ops, false))}
      </List.Section>

      <List.EmptyView
        title="No scenarios"
        description={`No scenarios match your filter in ${selection.teamName}.`}
        actions={
          <ActionPanel>
            <Action
              title="Change Organization/team"
              onAction={() => void onChangeOrgTeam()}
            />
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
