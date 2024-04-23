import { getPreferenceValues, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { isWeekend } from "date-fns";
import { getRemainingTime, getIcon, getTitle } from "./utils/time";

export default function Command() {
  const now = new Date();
  const { hours, minutes } = getRemainingTime(now);
  const { includeWeekends, startHour } = getPreferenceValues();

  if (hours < 0 || minutes < 0) {
    return null;
  }

  const [startHours, startMinutes] = startHour.split(":").map(Number);
  const startTime = startHours + (startMinutes || 0) / 60;
  if (now.getHours() < startTime) {
    return null;
  }

  if (!includeWeekends && isWeekend(now)) {
    return null;
  }

  return (
    <MenuBarExtra icon={getIcon(hours)} title={getTitle(hours, minutes)}>
      <MenuBarExtra.Item
        title="Configure Command"
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => openCommandPreferences()}
      />
    </MenuBarExtra>
  );
}
