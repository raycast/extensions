import { MenuBarExtra, Icon, Color, open, getPreferenceValues, openExtensionPreferences, Cache } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchReviewRequests, notifyError, webSearchURL } from "./api";
import type { Preferences, ReviewRequest } from "./types";

function relativeTime(iso: string): string {
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(mo / 12);
  return `${y}y`;
}

const cache = new Cache();

type CachedData = {
  ts: number;
  count: number;
  items: ReviewRequest[];
};

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [count, setCount] = useState<number | null>(null);
  const [items, setItems] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // TTL in ms
  const refreshInterval = Math.max(10, Number(prefs.refreshInterval ?? 300)) * 1000;

  // Build a stable cache key (exclude the token).
  const cacheKey = useMemo(() => {
    const endpoint = prefs.graphqlEndpoint || "https://api.github.com/graphql";
    const exclude = prefs.excludeDrafts ? "1" : "0";
    const extra = prefs.extraQuery || "";
    const max = Math.min(Math.max(Number(prefs.maxItems ?? 20), 1), 100);
    return `review-requests:v1:${endpoint}|${exclude}|${extra}|${max}`;
  }, [prefs.graphqlEndpoint, prefs.excludeDrafts, prefs.extraQuery, prefs.maxItems]);

  // Track last fetch time and a single refresh timer.
  const lastFetchedRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  function clearRefreshTimer() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  function scheduleNextRefresh(baseTs?: number) {
    clearRefreshTimer();

    const base = baseTs ?? lastFetchedRef.current ?? 0;
    const now = Date.now();
    const effectiveBase = base > 0 ? base : now;
    const dueAt = effectiveBase + refreshInterval;
    const delay = Math.max(0, dueAt - now);

    refreshTimerRef.current = setTimeout(() => {
      void fetchAll(true);
    }, delay);
  }

  function isStale(ts?: number | null) {
    const refTs = ts ?? lastFetchedRef.current;
    if (!refTs) return true;
    return Date.now() - refTs >= refreshInterval;
  }

  const fetchAll = async (force?: boolean) => {
    // Do not refetch unless TTL expired, unless forced (e.g., "Refresh Now" or initial stale).
    if (!force && !isStale()) {
      setLoading(false);
      return;
    }

    if (!prefs.githubToken) {
      const msg = "Set your GitHub token in the extension preferences.";
      setError(msg);
      setLoading(false);
      return;
    }

    try {
      // Keep UI responsive if we already have data
      setLoading(items.length === 0);

      const res = await fetchReviewRequests({
        graphqlEndpoint: prefs.graphqlEndpoint || "https://api.github.com/graphql",
        token: prefs.githubToken,
        excludeDrafts: prefs.excludeDrafts,
        extraQuery: prefs.extraQuery,
        first: Math.min(Math.max(Number(prefs.maxItems ?? 20), 1), 100),
      });

      setCount(res.count);
      setItems(res.items);
      setError(null);

      const now = Date.now();
      lastFetchedRef.current = now;
      cache.set(cacheKey, JSON.stringify({ ts: now, count: res.count, items: res.items } as CachedData));

      // Align the next refresh to this fetch
      scheduleNextRefresh(now);
    } catch (e) {
      const msg = typeof e?.message === "string" ? e.message : "Unknown error";
      setError(msg);
      notifyError(msg);
      // Even on error, schedule another attempt after the full TTL
      scheduleNextRefresh(Date.now());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearRefreshTimer();

    // Prime UI from cache immediately.
    const raw = cache.get(cacheKey);
    let cached: CachedData | null = null;

    if (raw) {
      try {
        cached = JSON.parse(raw) as CachedData;
      } catch {
        cached = null;
      }
    }

    if (cached && typeof cached.ts === "number" && Array.isArray(cached.items)) {
      setCount(cached.count);
      setItems(cached.items);
      setError(null);
      lastFetchedRef.current = cached.ts;

      if (isStale(cached.ts)) {
        // Cache is stale — fetch now and realign timers
        void fetchAll(true);
      } else {
        // Cache is fresh — schedule next refresh exactly at TTL expiry
        setLoading(false);
        scheduleNextRefresh(cached.ts);
      }
    } else {
      // No cache — fetch immediately and schedule next refresh from now
      setLoading(true);
      void fetchAll(true);
    }

    return () => {
      clearRefreshTimer();
    };
  }, [
    cacheKey,
    prefs.githubToken,
    prefs.graphqlEndpoint,
    prefs.extraQuery,
    prefs.excludeDrafts,
    refreshInterval,
    prefs.maxItems,
  ]);

  const title = useMemo(() => {
    if (error) return "!";
    if (count === null) return "…";
    if (count > 99) return "99+";
    return String(count);
  }, [count, error]);

  const tooltip = useMemo(() => {
    if (error) return `Error: ${error}`;
    if (count === null) return "Loading review requests…";
    return `${count} review request${count === 1 ? "" : "s"}`;
  }, [count, error]);

  const searchURL = useMemo(
    () =>
      webSearchURL(prefs.graphqlEndpoint || "https://api.github.com/graphql", prefs.excludeDrafts, prefs.extraQuery),
    [prefs.graphqlEndpoint, prefs.excludeDrafts, prefs.extraQuery],
  );

  return (
    <MenuBarExtra
      icon={{ source: Icon.Bubble, tintColor: error ? Color.Red : Color.PrimaryText }}
      title={title}
      tooltip={tooltip}
      isLoading={loading}
    >
      {error ? (
        <>
          <MenuBarExtra.Item
            icon={Icon.ExclamationMark}
            title="Configuration or API Error"
            subtitle={error}
            onAction={() => openExtensionPreferences()}
          />
          <MenuBarExtra.Separator />
        </>
      ) : null}

      {items.length > 0 ? (
        <>
          {items.map((pr) => (
            <MenuBarExtra.Item
              key={pr.id}
              icon={pr.isDraft ? Icon.Circle : Icon.Dot}
              title={`${pr.repo} #${pr.number}`}
              subtitle={`${pr.title} • ${pr.authorLogin} • ${relativeTime(pr.updatedAt)} ago`}
              tooltip={`${pr.title}\n${pr.repo}#${pr.number} • by ${pr.authorLogin}\nUpdated ${relativeTime(pr.updatedAt)} ago`}
              onAction={() => open(pr.url)}
            />
          ))}
          <MenuBarExtra.Separator />
        </>
      ) : (
        !loading && !error && <MenuBarExtra.Item icon={Icon.Checkmark} title="No review requests" />
      )}

      <MenuBarExtra.Item title="Open Search on GitHub" icon={Icon.Globe} onAction={() => open(searchURL)} />
      <MenuBarExtra.Item title="Refresh Now" icon={Icon.RotateClockwise} onAction={() => fetchAll(true)} />
      <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
    </MenuBarExtra>
  );
}
