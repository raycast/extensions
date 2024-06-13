import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { calData, calDateTitle, calFirstColumn, calWeekTitle } from "./utils/calendar-utils";
import { CALENDAR_APP, REMINDERS_APP, SETTINGS_APP } from "./utils/constans";
import { highlightCalendar, showCalendar, showReminders, showSettings, showWeekNumber } from "./types/preferences";
import {
  extraItemIcon,
  getWeekNumberColor,
  getWeekNumIcon,
  menubarIcon,
  menubarTitle,
  openApp,
} from "./utils/common-utils";

export default function Command() {
  return (
    <MenuBarExtra title={menubarTitle()} icon={menubarIcon()}>
      <MenuBarExtra.Item title={calDateTitle} onAction={highlightCalendar ? () => {} : undefined} />
      <MenuBarExtra.Item title={calWeekTitle} onAction={highlightCalendar ? () => {} : undefined} />
      {calData().map((calRow, index) => (
        <MenuBarExtra.Item
          key={index}
          icon={
            showWeekNumber
              ? {
                  source: getWeekNumIcon(calFirstColumn()[index]),
                  tintColor: getWeekNumberColor,
                }
              : undefined
          }
          title={calRow}
          onAction={highlightCalendar ? () => {} : undefined}
        />
      ))}

      <MenuBarExtra.Section>
        {showCalendar && (
          <MenuBarExtra.Item
            title={"Calendar"}
            icon={extraItemIcon(CALENDAR_APP, Icon.Calendar)}
            onAction={async () => {
              await openApp(CALENDAR_APP);
            }}
          />
        )}
        {showReminders && (
          <MenuBarExtra.Item
            title={"Reminders"}
            icon={extraItemIcon(REMINDERS_APP, Icon.BulletPoints)}
            onAction={async () => {
              await openApp(REMINDERS_APP);
            }}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {showSettings && (
          <MenuBarExtra.Item
            title={"Settings..."}
            icon={extraItemIcon(SETTINGS_APP, Icon.Gear)}
            onAction={async () => {
              await openCommandPreferences();
            }}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
