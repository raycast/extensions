import { Color, getPreferenceValues, Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { differenceInMinutes, isWeekend } from "date-fns";

function getRemainingTime(now: Date) {
  const { endHour } = getPreferenceValues();
  const endOfWorkday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour);

  const difference = differenceInMinutes(endOfWorkday, now, { roundingMethod: "floor" });
  const hours = Math.floor(difference / 60);
  const minutes = difference - hours * 60;

  return { hours, minutes };
}

function getIcon(hours: number) {
  if (hours < 1) {
    return { source: Icon.Clock, tintColor: Color.Red };
  } else if (hours < 2) {
    return { source: Icon.Clock, tintColor: Color.Orange };
  } else if (hours < 3) {
    return { source: Icon.Clock, tintColor: Color.Yellow };
  } else {
    return { source: Icon.Clock };
  }
}

function getTitle(hours: number, minutes: number) {
  if (!minutes) {
    return `${hours}h`;
  } else if (!hours) {
    return `${minutes}m`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

export default function Command() {
  const now = new Date();
  const { hours, minutes } = getRemainingTime(now);
  const { includeWeekends, startHour } = getPreferenceValues();

  if (hours < 0 || minutes < 0) {
    return null;
  }

  if (now.getHours() < startHour) {
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
