import { Cache } from "@raycast/api";
import { DASHBOARD_CACHE_KEY, PROFILE_ID_CACHE_KEY, rateCacheKey } from "./cache-keys";
import { parseAmount } from "./classify";
import { RateLimitCooldownError } from "./rate-limit";
import { buildSampleSnapshot } from "./sample-data";
import { inferPrimaryCurrency, summarizeActivities } from "./summarize";
import {
  BalanceWithDisplay,
  DashboardSnapshot,
  Prefs,
  WiseActivity,
  WiseBalance,
  WiseProfile,
  WiseRate,
} from "./types";
import { wiseGet } from "./wise-client";

const cache = new Cache();
const PROFILE_ID_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchPersonalProfileId(token: string, signal?: AbortSignal): Promise<number> {
  const cached = cache.get(PROFILE_ID_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { id: number; ts: number; tokenTail: string };
      if (
        parsed.tokenTail === token.slice(-8) &&
        typeof parsed.id === "number" &&
        Date.now() - parsed.ts < PROFILE_ID_TTL_MS
      ) {
        return parsed.id;
      }
    } catch {
      // refetch on parse failure
    }
  }
  const profiles = await wiseGet<WiseProfile[]>("/v2/profiles", token, signal);
  const personal = profiles.find((p) => p.type === "PERSONAL");
  if (!personal) throw new Error("No PERSONAL profile found in Wise");
  try {
    cache.set(PROFILE_ID_CACHE_KEY, JSON.stringify({ id: personal.id, ts: Date.now(), tokenTail: token.slice(-8) }));
  } catch {
    // ignore
  }
  return personal.id;
}

export async function fetchBalances(token: string, profileId: number, signal?: AbortSignal): Promise<WiseBalance[]> {
  return wiseGet<WiseBalance[]>(`/v4/profiles/${profileId}/balances?types=STANDARD,SAVINGS`, token, signal);
}

export async function fetchActivities(
  token: string,
  profileId: number,
  size: number,
  signal?: AbortSignal,
): Promise<WiseActivity[]> {
  const res = await wiseGet<{ activities?: WiseActivity[] }>(
    `/v1/profiles/${profileId}/activities?size=${size}`,
    token,
    signal,
  );
  return res?.activities ?? [];
}

const RATE_TTL_MS = 6 * 60 * 60 * 1000;

export async function fetchRate(
  token: string,
  source: string,
  target: string,
  signal?: AbortSignal,
): Promise<number | null> {
  if (source === target) return 1;
  const key = rateCacheKey(source, target);
  const cached = cache.get(key);
  let cachedRate: number | null = null;
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { rate: number; ts: number };
      cachedRate = parsed.rate;
      if (Date.now() - parsed.ts < RATE_TTL_MS) return parsed.rate;
    } catch {
      // ignore parse errors
    }
  }
  try {
    const res = await wiseGet<WiseRate[]>(`/v1/rates?source=${source}&target=${target}`, token, signal);
    if (!Array.isArray(res) || res.length === 0) return cachedRate;
    const rate = res[0].rate;
    try {
      cache.set(key, JSON.stringify({ rate, ts: Date.now() }));
    } catch {
      // ignore
    }
    return rate;
  } catch (e) {
    // A cooldown means wiseGet exhausted its retry budget and just engaged the
    // 5-minute block. Surface it so useDashboard shows the toast now, instead of
    // silently degrading to "(partial)" and only failing on the next refresh.
    if (e instanceof RateLimitCooldownError) throw e;
    return cachedRate;
  }
}

export async function fetchDashboardSnapshot(prefs: Prefs, signal?: AbortSignal): Promise<DashboardSnapshot> {
  if (prefs.useSampleData) {
    return await buildSampleSnapshot(prefs);
  }

  const { apiToken: token, displayCurrency, fxTargetCurrency } = prefs;

  const profileId = await fetchPersonalProfileId(token, signal);

  const [balancesRes, activitiesRes] = await Promise.allSettled([
    fetchBalances(token, profileId, signal),
    fetchActivities(token, profileId, 100, signal),
  ]);

  if (balancesRes.status === "rejected") throw balancesRes.reason;
  const balances: WiseBalance[] = balancesRes.value;

  let activities: WiseActivity[] = [];
  let activitiesError: string | undefined;
  if (activitiesRes.status === "fulfilled") {
    activities = activitiesRes.value;
  } else {
    activitiesError = (activitiesRes.reason as Error).message ?? "Error fetching activity";
  }

  let withDisplay: BalanceWithDisplay[] = balances.map((b) => ({ ...b }));
  let total: DashboardSnapshot["total"];
  const ratesByPair = new Map<string, { source: string; target: string; rate: number }>();
  if (displayCurrency) {
    const activityCurrencies = new Set<string>();
    for (const a of activities) {
      const p = parseAmount(a.primaryAmount);
      if (p) activityCurrencies.add(p.currency);
      const s = parseAmount(a.secondaryAmount);
      if (s) activityCurrencies.add(s.currency);
    }
    const needsRate = (b: WiseBalance) => Math.abs(b.amount.value) > 0.005 || activityCurrencies.has(b.currency);

    let sum = 0;
    let partial = false;
    const ratePromises = balances.map(async (b) => {
      if (b.currency === displayCurrency) return { id: b.id, equiv: b.amount.value, rate: 1, source: b.currency };
      if (!needsRate(b)) return { id: b.id, equiv: 0, rate: null, source: b.currency };
      const r = await fetchRate(token, b.currency, displayCurrency, signal);
      return { id: b.id, equiv: r != null ? b.amount.value * r : undefined, rate: r, source: b.currency };
    });
    const settled = await Promise.all(ratePromises);
    const byId = new Map(settled.map((s) => [s.id, s.equiv]));
    withDisplay = balances.map((b) => ({ ...b, displayEquiv: byId.get(b.id) }));
    for (const s of settled) {
      if (s.rate != null && s.source !== displayCurrency) {
        ratesByPair.set(`${s.source}->${displayCurrency}`, {
          source: s.source,
          target: displayCurrency,
          rate: s.rate,
        });
      }
    }
    for (const w of withDisplay) {
      if (w.displayEquiv == null) {
        partial = true;
      } else {
        sum += w.displayEquiv;
      }
    }
    total = { value: sum, currency: displayCurrency, partial };
  }

  let fxRate: DashboardSnapshot["fxRate"];
  if (displayCurrency && fxTargetCurrency && displayCurrency !== fxTargetCurrency) {
    const r = await fetchRate(token, displayCurrency, fxTargetCurrency, signal);
    if (r != null) {
      fxRate = { source: displayCurrency, target: fxTargetCurrency, rate: r };
      ratesByPair.set(`${displayCurrency}->${fxTargetCurrency}`, {
        source: displayCurrency,
        target: fxTargetCurrency,
        rate: r,
      });
    }
  }
  const usedRates = Array.from(ratesByPair.values());

  const summaryCurrency = displayCurrency || inferPrimaryCurrency(activities);
  const summary = await summarizeActivities(
    activities,
    summaryCurrency,
    (from, to) => fetchRate(token, from, to, signal),
    8,
  );

  const snapshot: DashboardSnapshot = {
    profileId,
    balances: withDisplay,
    total,
    summary,
    activities,
    fxRate,
    usedRates,
    fetchedAt: Date.now(),
    activitiesError,
  };

  try {
    cache.set(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }

  return snapshot;
}

export function loadCachedSnapshot(): DashboardSnapshot | null {
  const raw = cache.get(DASHBOARD_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DashboardSnapshot;
    return { ...parsed, stale: true };
  } catch {
    return null;
  }
}
