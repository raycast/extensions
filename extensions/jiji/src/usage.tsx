import { getPreferenceValues, Icon, Keyboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ClaudeAuthError, fetchUsage } from "./lib/claude";
import { formatLastUpdated, formatPercent, formatReset, resetDuration } from "./lib/format";
import { Metric } from "./lib/types";

interface Preferences {
  sessionKey: string;
}

const USAGE_PAGE = "https://claude.ai/settings/usage";

// The Claude spark logomark, monochrome so it templates cleanly in the menu bar
// (black in light menu bars, white in dark ones).
const CLAUDE_ICON = { source: { light: "claude.png", dark: "claude@dark.png" } };

export default function Command() {
  const { sessionKey } = getPreferenceValues<Preferences>();
  const hasKey = Boolean(sessionKey && sessionKey.trim());

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (key: string) => ({ usage: await fetchUsage(key), fetchedAt: Date.now() }),
    [sessionKey],
    { execute: hasKey, keepPreviousData: true },
  );

  // First-run / misconfigured: no session key yet.
  if (!hasKey) {
    return (
      <MenuBarExtra icon={CLAUDE_ICON} tooltip="Jiji — set your Claude session key">
        <MenuBarExtra.Item title="Set your Claude session key…" icon={Icon.Key} onAction={openCommandPreferences} />
      </MenuBarExtra>
    );
  }

  const usage = data?.usage;
  const isAuthError = error instanceof ClaudeAuthError;
  // The menu bar reflects the current session (5-hour window) specifically.
  // `?? []` guards against cached data from an older extension shape.
  const session = usage?.session ?? null;
  const weeklyAll = usage?.weeklyAll ?? null;
  const models = usage?.models ?? [];
  const percent = session?.percent ?? null;

  // Menu-bar title: "33% · 3h 12m" — session percent then its reset time.
  const reset = session ? resetDuration(session.resetsAt) : null;
  const title = !isAuthError && percent != null ? `${formatPercent(percent)}${reset ? ` · ${reset}` : ""}` : undefined;

  // Detailed panel = weekly windows only (the session lives in the menu bar).
  const weeklyRows = [...(weeklyAll ? [{ label: "All models", metric: weeklyAll }] : []), ...models];

  return (
    <MenuBarExtra isLoading={isLoading} icon={CLAUDE_ICON} title={title} tooltip="Claude usage (Jiji)">
      {isAuthError ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Not signed in"
            subtitle="Update your session key"
            onAction={openCommandPreferences}
          />
        </MenuBarExtra.Section>
      ) : weeklyRows.length > 0 ? (
        <MenuBarExtra.Section title="Weekly">
          {weeklyRows.map((r) => (
            <MetricItem key={r.label} label={r.label} metric={r.metric} />
          ))}
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={isLoading ? "Loading…" : "No usage data"} />
        </MenuBarExtra.Section>
      )}

      {error && !isAuthError ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Couldn't refresh" subtitle={error.message} icon={Icon.Warning} />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Last updated: ${formatLastUpdated(data ? new Date(data.fetchedAt) : null)}`}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item title="Open Usage Page" icon={Icon.Globe} onAction={() => open(USAGE_PAGE)} />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function MetricItem({ label, metric }: { label: string; metric?: Metric | null }) {
  const percent = metric ? metric.percent : null;
  const reset = metric ? formatReset(metric.resetsAt) : null;
  return <MenuBarExtra.Item title={`${label} — ${formatPercent(percent)}`} subtitle={reset ?? undefined} />;
}
