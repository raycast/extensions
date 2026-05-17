import {
  Color,
  getPreferenceValues,
  Icon,
  MenuBarExtra,
  openCommandPreferences,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { RESOURCE_ICONS, RESOURCE_LABELS, RESOURCE_ORDER } from "./types";
import type { RateLimitResource } from "./types";
import {
  applyTemplate,
  buildSubstitutions,
  formatCountdown,
  formatReset,
  useGHRateLimit,
  usagePct,
} from "./useGHRateLimit";
import { getRefreshIntervalMs } from "./preferences";

function usageColor(pct: number): Color {
  if (pct >= 80) return Color.Red;
  if (pct >= 50) return Color.Yellow;
  return Color.PrimaryText;
}

function buildTitle(
  template: string,
  resource: RateLimitResource | undefined,
  data: ReturnType<typeof useGHRateLimit>["data"],
  isLoading: boolean,
  hasError: boolean,
): string {
  if (hasError) return "GH ⚠";
  if (!resource || !data) return isLoading ? "GH …" : "GH ⚠";
  return applyTemplate(template, buildSubstitutions(data.resources, resource));
}

export default function MenuBarGHUsage() {
  const { data, isLoading, error, revalidate } = useGHRateLimit();
  const mbPrefs = getPreferenceValues<Preferences.MenubarGhUsage>();
  const resourceKey = mbPrefs.menuBarResource || "core";
  const template = mbPrefs.menuBarTemplate;
  const featuredResource =
    data?.resources[resourceKey as keyof typeof data.resources];

  const nextRefreshAt = useRef<number | null>(null);
  const [nextIn, setNextIn] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      nextRefreshAt.current = Date.now() + getRefreshIntervalMs();
      setNextIn(formatCountdown(nextRefreshAt.current));
    }
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (nextRefreshAt.current)
        setNextIn(formatCountdown(nextRefreshAt.current));
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const title = buildTitle(
    template,
    featuredResource,
    data,
    isLoading,
    !!error,
  );

  return (
    <MenuBarExtra icon={getFavicon("https://github.com")} title={title}>
      <MenuBarExtra.Section title="Rate Limits · Remaining">
        {error ? (
          <MenuBarExtra.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={`Error: ${String(error)}`}
          />
        ) : (
          RESOURCE_ORDER.filter((key) => key in (data?.resources ?? {})).map(
            (key) => {
              const resource =
                data?.resources[key as keyof typeof data.resources];
              if (!resource) return null;
              const pct = usagePct(resource.used, resource.limit);
              const label = RESOURCE_LABELS[key] ?? key;
              return (
                <MenuBarExtra.Item
                  key={key}
                  icon={{
                    source: RESOURCE_ICONS[key] ?? Icon.Circle,
                    tintColor: usageColor(pct),
                  }}
                  title={`${label} — ${resource.remaining.toLocaleString()} / ${resource.limit.toLocaleString()}`}
                  subtitle={`resets in ${formatReset(resource.reset)}`}
                />
              );
            },
          )
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Refresh"
        subtitle={nextIn ? `next in ${nextIn}` : undefined}
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Preferences…"
        icon={Icon.Gear}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra>
  );
}
