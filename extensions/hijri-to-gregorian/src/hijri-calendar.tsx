import { List, Icon, Clipboard, showHUD, ActionPanel, Action } from "@raycast/api";
import {
  getTodayHijri,
  convertHijriToGregorian,
  getHijriMonthName,
  getDayName,
  HijriDate,
  GREGORIAN_MONTHS,
} from "./utils";

function getNextDays(count: number): Array<{ hijri: HijriDate; dayName: { english: string; arabic: string } }> {
  const days: Array<{ hijri: HijriDate; dayName: { english: string; arabic: string } }> = [];
  const today = getTodayHijri();

  for (let i = 0; i < count; i++) {
    // Calculate the date by adding days
    let year = today.year;
    let month = today.month;
    let day = today.day + i;

    // Simple month overflow handling
    const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
    while (day > monthLengths[month - 1]) {
      day -= monthLengths[month - 1];
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    const hijri: HijriDate = { year, month, day };
    const gregorian = convertHijriToGregorian(hijri);
    const dayName = getDayName(gregorian);

    days.push({ hijri, dayName });
  }

  return days;
}

export default function Command() {
  const days = getNextDays(14); // Show 2 weeks

  return (
    <List>
      {days.map((item, index) => {
        const { hijri, dayName } = item;
        const hijriMonth = getHijriMonthName(hijri.month);
        const gregorian = convertHijriToGregorian(hijri);
        const gregorianMonth = GREGORIAN_MONTHS[gregorian.month - 1];

        const isToday = index === 0;
        const hijriStr = `${hijri.day} ${hijriMonth.english}`;
        const gregorianStr = `${gregorian.day} ${gregorianMonth.english}`;
        const copyText = `${hijri.day} ${hijriMonth.english} ${hijri.year} (${gregorian.day} ${gregorianMonth.english} ${gregorian.year})`;

        return (
          <List.Item
            key={index}
            icon={isToday ? Icon.Star : Icon.Calendar}
            title={`${dayName.english.substring(0, 3)} ${hijriStr}`}
            subtitle={hijriMonth.arabic}
            accessories={[{ text: gregorianStr }, { text: dayName.arabic }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Date"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(copyText);
                    await showHUD(`📅 ${copyText} (copied!)`);
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
