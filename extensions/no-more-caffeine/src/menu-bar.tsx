import { MenuBarExtra, Icon, Color, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getIntakes } from "./utils/storage";
import { calculateCaffeineMetrics } from "./utils/caffeineModel";
import { getSettings } from "./utils/preferences";

import { getStatusText, getStatusColor } from "./utils/statusHelpers";

async function openCommand(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn’t open command" });
  }
}

export default function Command() {
  const { data: intakes, isLoading } = useCachedPromise(getIntakes);

  const settings = getSettings();

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
        <MenuBarExtra.Item icon={Icon.Plus} title="Log Caffeine" onAction={() => openCommand("log-caffeine")} />
        <MenuBarExtra.Item icon={Icon.List} title="Today's Caffeine" onAction={() => openCommand("todays-caffeine")} />
        <MenuBarExtra.Item icon={Icon.Mug} title="Quick Log Caffeine" onAction={() => openCommand("quick-log")} />
        <MenuBarExtra.Item
          icon={Icon.LineChart}
          title="Caffeine Timeline"
          onAction={() => openCommand("caffeine-timeline")}
        />
        <MenuBarExtra.Item
          icon={Icon.BarChart}
          title="Caffeine History"
          onAction={() => openCommand("caffeine-history")}
        />
        <MenuBarExtra.Item icon={Icon.Gear} title="Settings" onAction={() => openCommand("caffeine-settings")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
