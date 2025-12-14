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

  const hijriWithArabic = formatHijriDate(hijri);
  const gregorianFormatted = formatGregorianDate(gregorian, false);

  // Menu bar shows short Hijri date
  const menuBarTitle = `${hijri.day} ${hijriMonth.english.substring(0, 3)} ${hijri.year}`;

  async function copyText(text: string, message: string) {
    await Clipboard.copy(text);
    await showHUD(message);
  }

  return (
    <MenuBarExtra icon={Icon.Calendar} title={menuBarTitle} tooltip="Hijri Date">
      <MenuBarExtra.Section title="🌙 Today's Hijri Date">
        <MenuBarExtra.Item
          title={hijriWithArabic}
          icon={Icon.Calendar}
          onAction={() => copyText(hijriWithArabic, "Hijri date copied!")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="📅 Gregorian Date">
        <MenuBarExtra.Item
          title={gregorianFormatted}
          icon={Icon.Calendar}
          onAction={() => copyText(gregorianFormatted, "Gregorian date copied!")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={`📆 ${dayName.english}`}>
        <MenuBarExtra.Item
          title={dayName.arabic}
          icon={Icon.Clock}
          onAction={() => copyText(`${dayName.english} (${dayName.arabic})`, "Day name copied!")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Copy Both Dates"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={() => copyText(`${hijriWithArabic}\n${gregorianFormatted}`, "Both dates copied!")}
        />
        <MenuBarExtra.Item
          title="Hijri Calendar"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => launchCommand({ name: "hijri-calendar", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Convert Hijri → Gregorian"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          onAction={() => launchCommand({ name: "convert-date", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Convert Gregorian → Hijri"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          onAction={() => launchCommand({ name: "gregorian-to-hijri", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Hide Menu Bar..." icon={Icon.EyeDisabled} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
