import { getPreferenceValues, MenuBarExtra, openCommandPreferences, updateCommandMetadata } from "@raycast/api";
import { isWeekend } from "date-fns";
import { getRemainingTime, getIcon, getTitle, getRemainingPercentage, getProgressBar } from "./utils/time";

export default function Command() {
  const now = new Date();
  const { hours, minutes } = getRemainingTime(now);
  const { includeWeekends } = getPreferenceValues();
  const progress = getRemainingPercentage(now);

  updateCommandMetadata({
    subtitle: getProgressBar((!includeWeekends && isWeekend(now)) || progress < 0 || progress > 100 ? null : progress),
  });

  if ((!includeWeekends && isWeekend(now)) || progress <= 0 || progress >= 100) {
    return null;
  }

  return (
    <MenuBarExtra icon={getIcon(hours, minutes)} title={getTitle(hours, minutes)}>
      <MenuBarExtra.Item
        title="Configure Command"
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => openCommandPreferences()}
      />
    </MenuBarExtra>
  );
}
