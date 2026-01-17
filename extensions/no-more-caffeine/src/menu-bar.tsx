import { MenuBarExtra, Icon, Color, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getIntakes } from "./utils/storage";
import { calculateCaffeineMetrics } from "./utils/caffeineModel";
import { Settings } from "./types";

function getStatusText(status: string): string {
  switch (status) {
    case "no-more-caffeine":
      return "No More Caffeine";
    case "warning":
      return "Warning";
    case "safe":
      return "Safe";
    default:
      return "Unknown";
  }
}

function getStatusColor(status: string): Color {
  switch (status) {
    case "no-more-caffeine":
      return Color.Red;
    case "warning":
      return Color.Orange;
    case "safe":
      return Color.Green;
    default:
      return Color.PrimaryText;
  }
}

export default function Command() {
  const { data: intakes, isLoading } = useCachedPromise(getIntakes);

  const preferences = getPreferenceValues<{
    bedtime: string;
    halfLife: string;
    maxCaffeineAtBedtime: string;
    dailyMaxCaffeine?: string;
  }>();

  const settings: Settings = {
    bedtime: preferences.bedtime || "22:00",
    halfLife: parseFloat(preferences.halfLife || "5"),
    maxCaffeineAtBedtime: parseFloat(preferences.maxCaffeineAtBedtime || "50"),
    dailyMaxCaffeine: preferences.dailyMaxCaffeine ? parseFloat(preferences.dailyMaxCaffeine) : undefined,
  };

  const calculation = intakes ? calculateCaffeineMetrics(intakes, settings) : null;
  const statusText = calculation ? getStatusText(calculation.status) : "Loading...";
  const statusColor = calculation ? getStatusColor(calculation.status) : Color.PrimaryText;

  return (
    <MenuBarExtra isLoading={isLoading} title={`☕${statusText}`}>
      {calculation && (
        <MenuBarExtra.Section title="Caffeine Information">
          <MenuBarExtra.Item icon={{ source: Icon.Info, tintColor: statusColor }} title={`Status: ${statusText}`} />
          <MenuBarExtra.Item
            icon={Icon.Heart}
            title={`Current Residual: ${calculation.currentResidual.toFixed(1)} mg`}
          />
          <MenuBarExtra.Item
            icon={Icon.Moon}
            title={`Bedtime Residual: ${calculation.predictedResidualAtBedtime.toFixed(1)} mg`}
          />
          <MenuBarExtra.Item icon={Icon.Calendar} title={`Today's Total: ${calculation.todayTotal.toFixed(1)} mg`} />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          icon={Icon.Plus}
          title="Log Caffeine"
          onAction={() => launchCommand({ name: "log-caffeine", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.List}
          title="Today's Caffeine"
          onAction={() => launchCommand({ name: "todays-caffeine", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Settings"
          onAction={() => launchCommand({ name: "caffeine-settings", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
