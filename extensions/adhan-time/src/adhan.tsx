import { Color, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { convertHours } from "../utils/convertHours";
import { usePrayerTimes } from "../utils/usePrayerTimes";
import { getPrayerProperties } from "../utils/prayersProperties";
import { PrayerProperty, Prayers } from "./prayer-types";
import { parseCountdown } from "../utils/parseCountdown";

type Section = {
  title: string;
  items: {
    key: string;
    value: string;
    properties: PrayerProperty;
  }[];
};

const prepareItems = (prayers: Prayers, sectionType: "prayers" | "times") => {
  return Object.entries(prayers as Record<keyof Prayers, string>)
    .filter(([key]) => {
      const properties = getPrayerProperties(key);
      return properties?.section === sectionType;
    })
    .sort(([keyA], [keyB]) => {
      const propA = getPrayerProperties(keyA);
      const propB = getPrayerProperties(keyB);
      return propA.sort - propB.sort;
    })
    .map(([key, value]) => ({
      key,
      value,
      properties: getPrayerProperties(key),
    }));
};

export default function Command() {
  const { isLoading, prayers, currentPrayer, countdown, userPreference } = usePrayerTimes();
  const displayIconOnly = userPreference.menu_bar_icon_only;

  const renderMenuItem = (key: string, value: string, properties: PrayerProperty) => {
    const isCurrent = key === currentPrayer?.current && properties.isPrayer;
    const timeLeftInMinutes = isCurrent ? parseCountdown(countdown) : 0;
    const color = timeLeftInMinutes > 30 ? Color.Green : timeLeftInMinutes > 10 ? Color.Orange : Color.Red;
    const icon = isCurrent ? { source: properties.icon, tintColor: color } : properties.icon;
    const prayerTime = userPreference.twelve_hours_system ? convertHours(value) : value;

    return (
      <MenuBarExtra.Item
        key={key}
        icon={icon}
        title={`${properties.name}: ${prayerTime}${isCurrent ? ` ${countdown}` : ""}`}
        onAction={
          isCurrent
            ? // Use this empty function to make the item active (white text)
              () => {
                return;
              }
            : undefined
        }
      />
    );
  };

  const sections: Section[] = prayers
    ? [
        {
          title: "Prayers",
          items: prepareItems(prayers, "prayers"),
        },
        {
          title: "Timings",
          items: prepareItems(prayers, "times"),
        },
      ]
    : [];

  return (
    <MenuBarExtra
      icon="menubar-icon.png"
      title={displayIconOnly ? "" : "Prayer Times"}
      tooltip="Prayer times"
      isLoading={isLoading}
    >
      {sections.map((section) => (
        <MenuBarExtra.Section key={section.title} title={section.title}>
          {section.items.map((item) => renderMenuItem(item.key, item.value, item.properties))}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Change location Preferences" onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
