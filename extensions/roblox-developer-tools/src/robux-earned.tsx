import {
  Cache,
  getPreferenceValues,
  Icon,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EarningsCache,
  EarningsRequestError,
  earningsCacheKey,
  earningsConfig,
  fetchEarningsSourceName,
  fetchGameEarnings,
  formatEarnings,
  periods,
  syncTransactionEarnings,
} from "./earnings";

const cache = new Cache({ namespace: "robux-earned-v3" });

function readCache(key: string): EarningsCache {
  try {
    const value = JSON.parse(cache.get(key) ?? "{}");
    if (!value || typeof value !== "object") return {};
    if (
      value.snapshot &&
      (!Number.isFinite(value.snapshot.total) ||
        !Number.isFinite(value.snapshot.asOf))
    )
      return {};
    if (
      value.scan &&
      (!Array.isArray(value.scan.types) ||
        !Array.isArray(value.scan.seen) ||
        !Number.isFinite(value.scan.total))
    )
      return {};
    return value;
  } catch {
    return {};
  }
}

function configuration(preferences: Preferences.RobuxEarned) {
  try {
    return { config: earningsConfig(preferences), error: undefined };
  } catch (error) {
    return {
      config: undefined,
      error:
        error instanceof Error
          ? error.message
          : "Check your earnings settings.",
    };
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.RobuxEarned>();
  const { config } = configuration(preferences);
  // A changed source or range starts fresh state; old requests cannot overwrite it.
  return (
    <EarningsMenu
      key={config ? earningsCacheKey(config) : "invalid"}
      preferences={preferences}
    />
  );
}

export function EarningsMenu({
  preferences,
}: {
  preferences: Preferences.RobuxEarned;
}) {
  const { config, error: configurationError } = useMemo(
    () => configuration(preferences),
    [
      preferences.earningsSource,
      preferences.earningsPeriod,
      preferences.universeId,
      preferences.apiKey,
      preferences.earningsUserId,
      preferences.robloxSecurityCookie,
    ],
  );
  const key = config ? earningsCacheKey(config) : "";
  const [state, setState] = useState<EarningsCache>(() =>
    key ? readCache(key) : {},
  );
  const [loading, setLoading] = useState(Boolean(config));
  const refreshing = useRef(false);
  const nameKey = config ? `name:${config.source}:${config.id}` : "";
  const [sourceName, setSourceName] = useState<{ key: string; name: string }>();

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    async function loadName() {
      try {
        const cached = JSON.parse(cache.get(nameKey) ?? "null");
        if (typeof cached?.name === "string") {
          setSourceName({ key: nameKey, name: cached.name });
          if (cached.expiresAt > Date.now()) return;
        }
        const name = await fetchEarningsSourceName(config!);
        if (cancelled) return;
        setSourceName({ key: nameKey, name });
        cache.set(
          nameKey,
          JSON.stringify({ name, expiresAt: Date.now() + 3_600_000 }),
        );
      } catch {
        // Name lookup must not interrupt earnings or discard a cached name.
      }
    }
    void loadName();
    return () => {
      cancelled = true;
    };
  }, [config, nameKey]);

  const refresh = useCallback(async () => {
    if (!config || refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    const current = readCache(key);
    const save = () => cache.set(key, JSON.stringify(current));
    try {
      // Opening the menu must not spend another page budget or retry a 429.
      if ((current.nextRefreshAt ?? 0) > Date.now()) return;
      current.nextRefreshAt = Date.now() + 30_000;
      delete current.error;
      save();
      if (config.source === "game") {
        const asOf = Date.now();
        const total = await fetchGameEarnings(config, asOf);
        current.snapshot = { total, asOf };
      } else {
        await syncTransactionEarnings(config, current, save);
      }
    } catch (error) {
      current.error =
        error instanceof Error ? error.message : "Unable to load earnings.";
      if (error instanceof EarningsRequestError && error.retryAt) {
        current.nextRefreshAt = Math.max(
          current.nextRefreshAt ?? 0,
          error.retryAt,
        );
      }
    } finally {
      try {
        save();
      } catch {
        current.error =
          "Unable to cache earnings. Check available disk space and retry.";
      }
      setState({ ...current });
      setLoading(false);
      refreshing.current = false;
    }
  }, [config, key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const error = configurationError ?? state.error;
  const snapshot = config ? state.snapshot : undefined;
  const period =
    config?.source === "game" && config.period === "all"
      ? "All-time (up to 4 years)"
      : config
        ? periods[config.period]
        : "Robux Earned";
  const source = config
    ? sourceName?.key === nameKey
      ? sourceName.name
      : config.source === "game"
        ? "Game"
        : "Roblox Account"
    : "Robux Earned";
  const amount = snapshot
    ? formatEarnings(snapshot.total, preferences.earningsDisplay)
    : undefined;
  const stale = Boolean(
    snapshot && (error || state.scan || Date.now() - snapshot.asOf > 120_000),
  );
  const progress = state.scan
    ? `Loading history: ${state.scan.pages} pages read`
    : undefined;
  const status =
    error ?? progress ?? (loading ? "Refreshing earnings…" : undefined);
  const earningsUrl =
    config?.source === "game"
      ? `https://create.roblox.com/dashboard/creations/experiences/${config.id}/analytics/monetization`
      : "https://www.roblox.com/transactions";

  if (
    preferences.hideZeroEarnings === true &&
    snapshot?.total === 0 &&
    !error
  ) {
    // Raycast unloads a command returning null. Keep it alive until refresh ends.
    return loading ? <MenuBarExtra isLoading /> : null;
  }

  return (
    <MenuBarExtra
      icon={{
        source: "robux-icon.png",
        tintColor: { light: "#15211F", dark: "#FFFFFF", adjustContrast: false },
      }}
      title={amount ?? (error ? "—" : "…")}
      tooltip={[
        "Robux Earned",
        source,
        period,
        amount,
        stale ? "Last completed total; open for status" : undefined,
        status,
      ]
        .filter(Boolean)
        .join(" · ")}
      isLoading={loading}
    >
      <MenuBarExtra.Item title={source} />
      <MenuBarExtra.Item title={period} />
      {snapshot && preferences.earningsDisplay !== "robux" && (
        <MenuBarExtra.Item
          title={`${formatEarnings(snapshot.total, "robux")} Robux earned`}
        />
      )}
      {snapshot && preferences.earningsDisplay !== "usd" && (
        <MenuBarExtra.Item
          title={`${formatEarnings(snapshot.total, "usd")} USD · DevEx estimate`}
        />
      )}
      {snapshot && (
        <MenuBarExtra.Item
          title={`As of ${new Date(snapshot.asOf).toLocaleString()}`}
        />
      )}
      {status && <MenuBarExtra.Item title={status} />}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open in Roblox"
        icon={Icon.Globe}
        onAction={() => open(earningsUrl)}
      />
      <MenuBarExtra.Item
        title="Settings"
        icon={Icon.Gear}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra>
  );
}
