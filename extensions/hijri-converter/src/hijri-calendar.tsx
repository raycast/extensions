import { List, Icon, Clipboard, showHUD, ActionPanel, Action } from "@raycast/api";
import {
  getHijriDateWithOffset,
  convertHijriToGregorian,
  getHijriMonthName,
  getDayName,
  HijriDate,
  GREGORIAN_MONTHS,
} from "./utils";

function getNextDays(count: number): Array<{ hijri: HijriDate; dayName: string }> {
  const days: Array<{ hijri: HijriDate; dayName: string }> = [];

  for (let i = 0; i < count; i++) {
    // Use library conversion for accurate date calculation across month boundaries
    const hijri = getHijriDateWithOffset(i);
    const gregorian = convertHijriToGregorian(hijri);
    const dayName = getDayName(gregorian);

    days.push({ hijri, dayName });
  }

  return days;
}

export default function Command() {
  const days = getNextDays(14); // Show 2 weeks

  return (
    <List searchBarPlaceholder="Browse upcoming Hijri dates">
      {days.map((item, index) => {
        const { hijri, dayName } = item;
        const hijriMonth = getHijriMonthName(hijri.month);
        const gregorian = convertHijriToGregorian(hijri);
        const gregorianMonth = GREGORIAN_MONTHS[gregorian.month - 1];

        const isToday = index === 0;
        const hijriStr = `${hijri.day} ${hijriMonth} ${hijri.year} AH`;
        const gregorianStr = `${gregorian.day} ${gregorianMonth.name} ${gregorian.year}`;
        const copyText = `${hijri.day} ${hijriMonth} ${hijri.year} AH (${gregorianStr})`;

        return (
          <List.Item
            key={index}
            icon={isToday ? Icon.Star : Icon.Calendar}
            title={`${dayName.substring(0, 3)} ${hijri.day} ${hijriMonth}`}
            subtitle={`${hijri.year} AH`}
            accessories={[{ text: gregorianStr }, ...(isToday ? [{ text: "Today" }] : [])]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Both Dates"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(copyText);
                    await showHUD("Both dates copied!");
                  }}
                />
                <Action
                  title="Copy Hijri Date"
                  icon={Icon.Calendar}
                  onAction={async () => {
                    await Clipboard.copy(hijriStr);
                    await showHUD("Hijri date copied!");
                  }}
                />
                <Action
                  title="Copy Gregorian Date"
                  icon={Icon.Calendar}
                  onAction={async () => {
                    await Clipboard.copy(gregorianStr);
                    await showHUD("Gregorian date copied!");
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
