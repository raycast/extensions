import { ActionPanel, Action, Detail, Clipboard, showHUD, popToRoot, Icon } from "@raycast/api";
import {
  getTodayHijri,
  getTodayGregorian,
  formatHijriDate,
  formatGregorianDate,
  formatHijriDateShort,
  formatGregorianDateShort,
  getDayName,
} from "./utils";

export default function Command() {
  const hijri = getTodayHijri();
  const gregorian = getTodayGregorian();
  const dayName = getDayName(gregorian);

  const hijriFormatted = formatHijriDate(hijri);
  const gregorianFormatted = formatGregorianDate(gregorian, false);
  const hijriShort = formatHijriDateShort(hijri);
  const gregorianShort = formatGregorianDateShort(gregorian);

  async function copyAndClose(text: string, message: string) {
    await Clipboard.copy(text);
    await showHUD(message);
    await popToRoot();
  }

  const markdown = `
# ${dayName} 
## • 🌙 ${hijriFormatted}  | \`${hijriShort}\`
## • 📆 ${gregorianFormatted} | \`${gregorianShort}\`


---

**Shortcuts:** 
- **⌘H** Copy Hijri
- **⌘G** Copy Gregorian
- **⌘C** Copy Both

`;

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
    />
  );
}
