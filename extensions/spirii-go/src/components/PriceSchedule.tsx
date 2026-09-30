import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { evseUrl } from "../api";
import { Evse, PriceElement } from "../types";
import {
  formatPrice,
  formatTimeWindow,
  prettyDate,
  isCurrent,
  isFallback,
  isUpcoming,
  statusColor,
  statusText,
  tierColor,
  tierForPrices,
} from "../utils";

type Props = { evseId: string; statusOverride?: string };

export default function PriceSchedule({ evseId, statusOverride }: Props) {
  const { data, isLoading, error, revalidate } = useFetch<Evse>(
    evseUrl(evseId),
    { keepPreviousData: true },
  );

  const { priceGranularity } = getPreferenceValues<Preferences>();
  const granularity: "hour" | "15min" = priceGranularity ?? "hour";

  // Tick once a minute so the "Now" / "Upcoming" split advances with the clock.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (error) showFailureToast(error, { title: "Could not load chargepoint" });
  }, [error]);

  const { currentEl, upcoming, currentPrice, isFixed } = useMemo(() => {
    const empty = {
      currentEl: null,
      upcoming: [],
      currentPrice: null,
      isFixed: false,
    };
    if (!data?.price) return empty;
    const els = data.price.elements ?? [];
    const current =
      els.find((e) => !isFallback(e) && isCurrent(e, now)) ?? null;
    const futureEls = els.filter((e) => !isFallback(e) && isUpcoming(e, now));
    const future =
      granularity === "hour" ? groupByHour(futureEls) : toRawBuckets(futureEls);
    const hasSchedule = current !== null || futureEls.length > 0;
    if (current) {
      return {
        currentEl: current,
        upcoming: future,
        currentPrice: current.price_components[0]?.price ?? null,
        isFixed: false,
      };
    }
    if (!hasSchedule && typeof data.price.perKwh === "number") {
      return {
        currentEl: null,
        upcoming: [],
        currentPrice: data.price.perKwh,
        isFixed: true,
      };
    }
    const fallback = !hasSchedule ? (els.find(isFallback) ?? null) : null;
    return {
      currentEl: fallback,
      upcoming: future,
      currentPrice: fallback?.price_components[0]?.price ?? null,
      isFixed: !hasSchedule && fallback !== null,
    };
  }, [data, granularity, now]);

  if (error && !data) {
    return (
      <List navigationTitle={evseId}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load chargepoint"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const tier = tierForPrices(upcoming.map((u) => u.price));
  const topCheapest = [...upcoming]
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  const currency = data?.price?.currency ?? "DKK";
  const nowTitle =
    currentPrice !== null
      ? formatPrice(currentPrice, currency)
      : "Price unavailable";
  const nowSubtitle = isFixed
    ? "Fixed price"
    : currentEl
      ? formatTimeWindow(currentEl)
      : "";
  // Spirii's per-evse endpoint ignores OutOfService; if the caller passed a
  // richer status from the parent listing and the evse endpoint claims the
  // chargepoint is otherwise fine, prefer the override.
  const status = pickStatus(data?.status, statusOverride);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={evseId}
      searchBarPlaceholder="Search prices…"
    >
      {data && (
        <List.Section title="Now">
          <List.Item
            icon={{ source: Icon.Bolt, tintColor: statusColor(status) }}
            title={nowTitle}
            subtitle={nowSubtitle}
            accessories={[
              {
                tag: { value: statusText(status), color: statusColor(status) },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Chargepoint ID"
                  content={data.evseId}
                />
                {currentPrice !== null && (
                  <Action.CopyToClipboard
                    title="Copy Current Price"
                    content={formatPrice(currentPrice, currency)}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  onAction={() => revalidate()}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {topCheapest.length > 0 && (
        <List.Section title="Cheapest">
          {topCheapest.map((hour, i) => {
            const t = tier(hour.price);
            return (
              <List.Item
                key={`cheap-${hour.date}-${hour.startTime}-${i}`}
                icon={{ source: Icon.Star, tintColor: tierColor(t) }}
                title={`${hour.startTime} – ${hour.endTime}`}
                subtitle={prettyDate(hour.date)}
                accessories={[
                  {
                    tag: {
                      value: formatPrice(hour.price, currency),
                      color: tierColor(t),
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Price"
                      content={formatPrice(hour.price, currency)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      onAction={() => revalidate()}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <List.Section title="Upcoming">
        {upcoming.map((hour, i) => {
          const t = tier(hour.price);
          return (
            <List.Item
              key={`${hour.date}-${hour.startTime}-${i}`}
              icon={{ source: Icon.Clock, tintColor: tierColor(t) }}
              title={`${hour.startTime} – ${hour.endTime}`}
              subtitle={prettyDate(hour.date)}
              accessories={[
                {
                  tag: {
                    value: formatPrice(hour.price, currency),
                    color: tierColor(t),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Price"
                    content={formatPrice(hour.price, currency)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {!isLoading && upcoming.length === 0 && !currentEl && (
        <List.EmptyView
          icon={Icon.Info}
          title="No price data"
          description="This chargepoint has no pricing schedule."
        />
      )}
    </List>
  );
}

function pickStatus(
  fresh: string | undefined,
  override: string | undefined,
): string {
  if (!fresh) return override ?? "";
  if (!override) return fresh;
  const o = override.toLowerCase();
  // Only honor the override when it reports an abnormal state the evse endpoint masks.
  if (
    o === "outofservice" ||
    o === "out_of_service" ||
    o === "unknown" ||
    o === "reserved"
  ) {
    return override;
  }
  return fresh;
}

type HourBucket = {
  date: string;
  startTime: string;
  endTime: string;
  price: number;
};

function toRawBuckets(els: PriceElement[]): HourBucket[] {
  return els
    .map((el) => {
      const r = el.restrictions!;
      return {
        date: r.start_date!,
        startTime: r.start_time!,
        endTime: r.end_time ?? "",
        price: el.price_components[0]?.price ?? 0,
      };
    })
    .sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
}

function groupByHour(els: PriceElement[]): HourBucket[] {
  const buckets = new Map<
    string,
    { date: string; hour: number; sum: number; count: number }
  >();
  for (const el of els) {
    const r = el.restrictions!;
    const hour = parseInt(r.start_time!.slice(0, 2), 10);
    if (!Number.isFinite(hour)) continue;
    const key = `${r.start_date}T${String(hour).padStart(2, "0")}`;
    const price = el.price_components[0]?.price ?? 0;
    const existing = buckets.get(key);
    if (existing) {
      existing.sum += price;
      existing.count += 1;
    } else {
      buckets.set(key, { date: r.start_date!, hour, sum: price, count: 1 });
    }
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      date: v.date,
      startTime: `${String(v.hour).padStart(2, "0")}:00`,
      endTime: `${String((v.hour + 1) % 24).padStart(2, "0")}:00`,
      price: v.sum / v.count,
    }));
}
