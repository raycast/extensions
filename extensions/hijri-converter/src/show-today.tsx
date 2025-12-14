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
# ${dayName}

---

| Hijri | Gregorian |
|:---:|:---:|
| **${hijri.day}** | **${gregorian.day}** |
| ${hijriMonth} | ${gregorianMonth.name} |
| ${hijri.year} AH | ${gregorian.year} |

---

## Quick Copy

Press **Cmd + H** for Hijri | **Cmd + G** for Gregorian | **Cmd + C** for Both
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
            onAction={() => copyAndClose(hijriFormatted, `${hijriFormatted} (copied!)`)}
          />
          <Action
            title="Copy Gregorian Date"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={() => copyAndClose(gregorianFormatted, `${gregorianFormatted} (copied!)`)}
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
          <Detail.Metadata.Label title="Hijri" text={`${hijri.day} ${hijriMonth} ${hijri.year}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Gregorian" text={gregorianFormatted} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Day" text={dayName} />
        </Detail.Metadata>
      }
    />
  );
}
