import {
  MenuBarExtra,
  Icon,
  Color,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUsageStats, getCredentials } from "./api";

function formatTierName(tier: string): string {
  return tier
    .replace(/^default_claude_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getUtilizationColor(utilization: number): Color {
  if (utilization >= 80) return Color.Red;
  if (utilization >= 50) return Color.Orange;
  if (utilization >= 25) return Color.Yellow;
  return Color.Green;
}

function formatResetTime(isoString: string | null): string {
  if (!isoString) return "N/A";
  const resetDate = new Date(isoString);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "now";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMins = diffMins % 60;

  if (diffDays > 0) return `${diffDays}d ${remainingHours}h`;
  if (diffHours > 0) return `${diffHours}h ${remainingMins}m`;
  return `${diffMins}m`;
}

function getMenuBarTitle(fiveHourUtil?: number, sevenDayUtil?: number): string {
  if (fiveHourUtil === undefined && sevenDayUtil === undefined) return "CC: --";
  const parts: string[] = [];
  if (fiveHourUtil !== undefined) parts.push(`5h: ${fiveHourUtil.toFixed(0)}%`);
  if (sevenDayUtil !== undefined) parts.push(`7d: ${sevenDayUtil.toFixed(0)}%`);
  return parts.join(" | ");
}

function getMenuBarIcon(
  fiveHourUtil?: number,
  sevenDayUtil?: number,
): { source: Icon; tintColor: Color } {
  const maxUtil = Math.max(fiveHourUtil ?? 0, sevenDayUtil ?? 0);
  return { source: Icon.BarChart, tintColor: getUtilizationColor(maxUtil) };
}

export default function MenuBar() {
  const { data, isLoading, revalidate } = useCachedPromise(
    fetchUsageStats,
    [],
    {
      keepPreviousData: true,
    },
  );
  const { data: creds } = useCachedPromise(getCredentials, [], {
    keepPreviousData: true,
  });

  const fiveHour = data?.five_hour;
  const sevenDay = data?.seven_day;
  const sonnet = data?.seven_day_opus;

  const subType = creds?.subscriptionType
    ? creds.subscriptionType.charAt(0).toUpperCase() +
      creds.subscriptionType.slice(1)
    : null;

  return (
    <MenuBarExtra
      icon={getMenuBarIcon(fiveHour?.utilization, sevenDay?.utilization)}
      title={getMenuBarTitle(fiveHour?.utilization, sevenDay?.utilization)}
      isLoading={isLoading}
    >
      {subType && (
        <MenuBarExtra.Section title={`Claude ${subType}`}>
          {creds?.rateLimitTier && (
            <MenuBarExtra.Item
              title={`Tier: ${formatTierName(creds.rateLimitTier)}`}
              icon={Icon.Shield}
            />
          )}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Current Session">
        <MenuBarExtra.Item
          icon={{
            source: Icon.Clock,
            tintColor: fiveHour
              ? getUtilizationColor(fiveHour.utilization)
              : Color.SecondaryText,
          }}
          title={`${fiveHour ? fiveHour.utilization.toFixed(1) : "--"}% used`}
          subtitle={
            fiveHour ? `Resets in ${formatResetTime(fiveHour.resets_at)}` : ""
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Weekly — All Models">
        <MenuBarExtra.Item
          icon={{
            source: Icon.Calendar,
            tintColor: sevenDay
              ? getUtilizationColor(sevenDay.utilization)
              : Color.SecondaryText,
          }}
          title={`${sevenDay ? sevenDay.utilization.toFixed(1) : "--"}% used`}
          subtitle={
            sevenDay ? `Resets in ${formatResetTime(sevenDay.resets_at)}` : ""
          }
        />
      </MenuBarExtra.Section>

      {sonnet && (
        <MenuBarExtra.Section title="Weekly — Sonnet Only">
          <MenuBarExtra.Item
            icon={{
              source: Icon.Star,
              tintColor: getUtilizationColor(sonnet.utilization),
            }}
            title={`${sonnet.utilization.toFixed(1)}% used`}
            subtitle={`Resets in ${formatResetTime(sonnet.resets_at)}`}
          />
        </MenuBarExtra.Section>
      )}

      {data?.seven_day_oauth_apps && (
        <MenuBarExtra.Section title="Weekly — OAuth Apps">
          <MenuBarExtra.Item
            icon={{
              source: Icon.Globe,
              tintColor: getUtilizationColor(
                data.seven_day_oauth_apps.utilization,
              ),
            }}
            title={`${data.seven_day_oauth_apps.utilization.toFixed(1)}% used`}
            subtitle={`Resets in ${formatResetTime(data.seven_day_oauth_apps.resets_at)}`}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Full View"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() =>
            launchCommand({
              name: "view-usage",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
