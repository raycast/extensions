import {
  MenuBarExtra,
  launchCommand,
  LaunchType,
  Icon,
  Clipboard,
  showHUD,
  openExtensionPreferences,
} from "@raycast/api";
import {
  getTodayHijri,
  getTodayGregorian,
  formatHijriDate,
  formatGregorianDate,
  getDayName,
  getHijriMonthName,
} from "./utils";

export default function Command() {
  const hijri = getTodayHijri();
  const gregorian = getTodayGregorian();
  const dayName = getDayName(gregorian);
  const hijriMonth = getHijriMonthName(hijri.month);

  const hijriFormatted = formatHijriDate(hijri);
  const gregorianFormatted = formatGregorianDate(gregorian, false);

  // Menu bar shows short Hijri date
  const menuBarTitle = `${hijri.day} ${hijriMonth.substring(0, 3)} ${hijri.year}`;

  async function copyText(text: string, message: string) {
    await Clipboard.copy(text);
    await showHUD(message);
  }

  return (
    <MenuBarExtra icon={Icon.Calendar} title={menuBarTitle} tooltip="Hijri Date">
      <MenuBarExtra.Section title="Today's Hijri Date">
        <MenuBarExtra.Item
          title={hijriFormatted}
          icon={Icon.Calendar}
          onAction={() => copyText(hijriFormatted, "Hijri date copied!")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Gregorian Date">
        <MenuBarExtra.Item
          title={gregorianFormatted}
          icon={Icon.Calendar}
          onAction={() => copyText(gregorianFormatted, "Gregorian date copied!")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={dayName}>
        <MenuBarExtra.Item
          title="Copy Day Name"
          icon={Icon.Clock}
          onAction={() => copyText(dayName, "Day name copied!")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Copy Both Dates"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={() => copyText(`${hijriFormatted}\n${gregorianFormatted}`, "Both dates copied!")}
        />
        <MenuBarExtra.Item
          title="Hijri Calendar"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={async () => {
            try {
              await launchCommand({ name: "hijri-calendar", type: LaunchType.UserInitiated });
            } catch {
              await showHUD("Failed to open Hijri Calendar");
            }
          }}
        />
        <MenuBarExtra.Item
          title="Convert Hijri to Gregorian"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          onAction={async () => {
            try {
              await launchCommand({ name: "convert-date", type: LaunchType.UserInitiated });
            } catch {
              await showHUD("Failed to open converter");
            }
          }}
        />
        <MenuBarExtra.Item
          title="Convert Gregorian to Hijri"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          onAction={async () => {
            try {
              await launchCommand({ name: "gregorian-to-hijri", type: LaunchType.UserInitiated });
            } catch {
              await showHUD("Failed to open converter");
            }
          }}
        />
        <MenuBarExtra.Item
          title="Show Today's Date"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            try {
              await launchCommand({ name: "show-today", type: LaunchType.UserInitiated });
            } catch {
              await showHUD("Failed to open today view");
            }
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Hide Menu Bar..." icon={Icon.EyeDisabled} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
