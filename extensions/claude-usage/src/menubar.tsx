import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  ClaudeApiError,
  fetchUsage,
  getCachedUsage,
  getPrefs,
} from "./lib/client";
import { computeBurnRate, recordSample } from "./lib/history";
import {
  countdown,
  pct,
  severityColor,
  severityIcon,
  windowSubtitle,
} from "./lib/format";
import type { ClaudeUsage, ExtraUsage, UsageWindow } from "./lib/types";

export default function MenuBar() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const usage = await fetchUsage();
      recordSample(usage);
      return usage;
    },
    [],
    { keepPreviousData: true },
  );

  const usage = data ?? getCachedUsage() ?? undefined;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={menuIcon(usage, Boolean(error))}
      title={menuTitle(usage, Boolean(error))}
      tooltip="Claude subscription usage"
    >
      {error && (
        <MenuBarExtra.Section title="Problem">
          <MenuBarExtra.Item
            icon={Icon.Warning}
            title={
              error instanceof ClaudeApiError
                ? error.message
                : "Could not load usage"
            }
            onAction={revalidate}
          />
        </MenuBarExtra.Section>
      )}

      {usage && (
        <>
          <MenuBarExtra.Section title="Limits">
            <LimitItem
              title="Current Session"
              w={usage.fiveHour}
              fallback="No active session — next prompt starts one"
            />
            <LimitItem
              title="Weekly — All Models"
              w={usage.sevenDay}
              fallback="No weekly data"
            />
            {getPrefs().showOpus && usage.sevenDayOpus && (
              <LimitItem title="Weekly — Opus" w={usage.sevenDayOpus} />
            )}
            {getPrefs().showOpus && usage.sevenDaySonnet && (
              <LimitItem title="Weekly — Sonnet" w={usage.sevenDaySonnet} />
            )}
          </MenuBarExtra.Section>

          {usage.extraUsage?.isEnabled && (
            <ExtraUsageSection extra={usage.extraUsage} />
          )}

          <PaceSection usage={usage} />
        </>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.BarChart}
          title="Open Dashboard"
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={openDashboard}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Usage Settings"
          onAction={() => open("https://claude.ai/settings/usage")}
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh Now"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            await fetchUsage({ force: true });
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Preferences…"
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/** Opening the dashboard doubles as the click action for the info rows, so
 * macOS renders them as enabled (bright) instead of disabled (dimmed grey). */
function openDashboard() {
  return launchCommand({ name: "dashboard", type: LaunchType.UserInitiated });
}

function LimitItem(props: {
  title: string;
  w: UsageWindow | null;
  fallback?: string;
}) {
  const { title, w, fallback = "—" } = props;
  if (!w) {
    return (
      <MenuBarExtra.Item
        icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
        title={title}
        subtitle={fallback}
        onAction={openDashboard}
      />
    );
  }
  return (
    <MenuBarExtra.Item
      icon={{
        source: severityIcon(w.utilization),
        tintColor: severityColor(w.utilization),
      }}
      title={`${title} · ${pct(w.utilization)}`}
      subtitle={windowSubtitle(w)}
      onAction={openDashboard}
    />
  );
}

function ExtraUsageSection({ extra }: { extra: ExtraUsage }) {
  const used =
    extra.usedCredits != null ? `$${extra.usedCredits.toFixed(2)}` : "—";
  const limit =
    extra.monthlyLimit != null ? `$${extra.monthlyLimit.toFixed(2)}` : "no cap";
  const util = extra.utilization ?? 0;
  const subtitle =
    extra.utilization != null
      ? `${used} of ${limit} · ${pct(util)}`
      : `${used} of ${limit}`;
  return (
    <MenuBarExtra.Section title="Extra Usage">
      <MenuBarExtra.Item
        icon={{ source: Icon.Coins, tintColor: severityColor(util) }}
        title="Extra Usage Credits"
        subtitle={subtitle}
        onAction={openDashboard}
      />
    </MenuBarExtra.Section>
  );
}

function PaceSection({ usage }: { usage: ClaudeUsage }) {
  const rate = computeBurnRate(usage);
  if (rate.sessionPerHour === null) return null;

  const items: string[] = [
    `Burn rate: ${rate.sessionPerHour.toFixed(1)} %/h (last ${rate.windowMinutes} min)`,
  ];
  if (rate.sessionExhaustedAt) {
    const cd = countdown(new Date(rate.sessionExhaustedAt).toISOString());
    if (cd) items.push(`At this pace, session limit in ~${cd}`);
  } else if (rate.projectedSessionAtReset !== null) {
    items.push(
      `Projected at reset: ~${pct(rate.projectedSessionAtReset)} — you're fine`,
    );
  }

  return (
    <MenuBarExtra.Section title="Pace">
      {items.map((t) => (
        <MenuBarExtra.Item
          key={t}
          icon={Icon.Bolt}
          title={t}
          onAction={openDashboard}
        />
      ))}
    </MenuBarExtra.Section>
  );
}

function menuTitle(usage: ClaudeUsage | undefined, hasError: boolean): string {
  if (!usage) return hasError ? "—" : "";
  const style = getPrefs().menuBarStyle;
  const s = usage.fiveHour ? pct(usage.fiveHour.utilization) : "–";
  const w = usage.sevenDay ? pct(usage.sevenDay.utilization) : "–";
  switch (style) {
    case "session":
      return s;
    case "weekly":
      return w;
    case "icon":
      return "";
    default:
      return `${s} · ${w}`;
  }
}

function menuIcon(usage: ClaudeUsage | undefined, hasError: boolean) {
  if (hasError && !usage) return Icon.WifiDisabled;
  const worst = Math.max(
    usage?.fiveHour?.utilization ?? 0,
    usage?.sevenDay?.utilization ?? 0,
  );
  return { source: Icon.Gauge, tintColor: severityColor(worst) };
}
