import { ActionPanel, Action, Detail, Clipboard, showHUD, popToRoot, Icon } from "@raycast/api";
import {
  getTodayHijri,
  getTodayGregorian,
  formatHijriDate,
  formatGregorianDate,
  getDayName,
  getHijriMonthName,
  GREGORIAN_MONTHS,
} from "./utils";

export default function Command() {
  const hijri = getTodayHijri();
  const gregorian = getTodayGregorian();
  const dayName = getDayName(gregorian);
  const hijriMonth = getHijriMonthName(hijri.month);
  const gregorianMonth = GREGORIAN_MONTHS[gregorian.month - 1];

  const hijriFormatted = formatHijriDate(hijri);
  const gregorianFormatted = formatGregorianDate(gregorian, false);

  const markdown = `
# ${dayName.english} ${dayName.arabic}

---

| 🌙 Hijri | 📅 Gregorian |
|:---:|:---:|
| **${hijri.day}** | **${gregorian.day}** |
| ${hijriMonth.english} | ${gregorianMonth.english} |
| ${hijriMonth.arabic} | ${gregorian.year} |
| ${hijri.year} AH | |

---

## Quick Copy

Press **⌘ + H** for Hijri · **⌘ + G** for Gregorian · **⌘ + C** for Both
`;

  async function copyAndClose(text: string, message: string) {
    await Clipboard.copy(text);
    await showHUD(message);
    await popToRoot();
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Hijri Date"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => copyAndClose(hijriFormatted, `🌙 ${hijriFormatted} (copied!)`)}
          />
          <Action
            title="Copy Gregorian Date"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={() => copyAndClose(gregorianFormatted, `📅 ${gregorianFormatted} (copied!)`)}
          />
          <Action
            title="Copy Both Dates"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => copyAndClose(`${hijriFormatted}\n${gregorianFormatted}`, "Both dates copied!")}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="🌙 Hijri" text={`${hijri.day} ${hijriMonth.english} ${hijri.year}`} />
          <Detail.Metadata.Label title="" text={hijriMonth.arabic} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="📅 Gregorian" text={gregorianFormatted} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="📆 Day" text={dayName.english} />
          <Detail.Metadata.Label title="" text={dayName.arabic} />
        </Detail.Metadata>
      }
    />
  );
}
