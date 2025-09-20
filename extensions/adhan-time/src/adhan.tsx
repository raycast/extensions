import { Clipboard, Color, MenuBarExtra, openExtensionPreferences, Icon, getPreferenceValues } from "@raycast/api";
import { calculateMinutesUntil, formatPrayerTime } from "../utils/dateTimeUtils";
import { usePrayerTimes } from "../utils/usePrayerTimes";
import React from "react";
import { Prayer } from "./types/prayerTypes";

type Section = {
  title: string;
  items: Prayer[];
};

const MenuBarIcon = {
  source: {
    dark: "menubar-icon.png",
    light: "menubar-icon-light.png",
  },
};

export default function Command() {
  const { isLoading, currentPeriod, hijriDate, countdown } = usePrayerTimes();
  const userPreference = getPreferenceValues();
  const displayIconOnly = userPreference.menu_bar_icon_only;

  const renderMenuItem = (prayer: Prayer) => {
    const isCurrent = currentPeriod && prayer.name === currentPeriod.current.name && prayer.type === "prayer";
    const timeLeftInMinutes = isCurrent && currentPeriod ? calculateMinutesUntil(currentPeriod.next.time) : 0;
    const color = timeLeftInMinutes >= 30 ? Color.Green : timeLeftInMinutes >= 10 ? Color.Orange : Color.Red;
    const icon = isCurrent ? { source: prayer.icon, tintColor: color } : prayer.icon;
    const prayerTime = formatPrayerTime(prayer.time, userPreference.twelve_hours_system);

    return (
      <React.Fragment key={prayer.name}>
        <MenuBarExtra.Item
          key={`${prayer.name}-title`}
          icon={icon}
          title={`${prayer.title}: ${prayerTime}`}
          onAction={
            isCurrent
              ? () => {
                  Clipboard.copy(`${prayer.title}: ${prayerTime}`);
                }
              : undefined
          }
        />
        {isCurrent && (
          <MenuBarExtra.Item
            key={`${prayer.name}-countdown`}
            title={`      ${countdown} until ${currentPeriod.next.title}`}
            onAction={() => {
              Clipboard.copy(`${countdown} until ${currentPeriod.next.title}`);
            }}
          />
        )}
      </React.Fragment>
    );
  };

  const sections: Section[] = currentPeriod
    ? [
        {
          title: "Prayers",
          items: currentPeriod.sortedTimings.filter((prayer) => prayer.type === "prayer"),
        },
        {
          title: "Timings",
          items: currentPeriod.sortedTimings.filter((prayer) => prayer.type === "timing"),
        },
      ]
    : [
        { title: "Prayers", items: [] },
        { title: "Timings", items: [] },
      ];

  return (
    <MenuBarExtra
      icon={MenuBarIcon}
      title={displayIconOnly ? "" : "Prayer Times"}
      tooltip="Prayer Times"
      isLoading={isLoading}
    >
      {currentPeriod && (
        <>
          {sections.map((section) => (
            <MenuBarExtra.Section key={section.title} title={section.title}>
              {section.items.map((item) => renderMenuItem(item))}
            </MenuBarExtra.Section>
          ))}
          <MenuBarExtra.Section key="date" title="Date">
            <MenuBarExtra.Item title={hijriDate} icon={Icon.Calendar} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Change location Preferences" onAction={() => openExtensionPreferences()} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
