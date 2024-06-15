import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { calData, calDateTitle, calFirstColumn, calWeekTitle } from "./utils/calendar-utils";
import { CALENDAR_APP, REMINDERS_APP, SETTINGS_APP } from "./utils/constans";
import {
  highlightCalendar,
  largeCalendar,
  showCalendar,
  showReminders,
  showSettings,
  showWeekNumber,
} from "./types/preferences";
import {
  extraItemIcon,
  getWeekNumberColor,
  getWeekNumIcon,
  menubarIcon,
  menubarTitle,
  openApp,
} from "./utils/common-utils";
import { Fragment } from "react";

export default function Command() {
  const calList = calData();
  return (
    <MenuBarExtra title={menubarTitle()} icon={menubarIcon()}>
      <MenuBarExtra.Item title={calDateTitle} onAction={highlightCalendar ? () => {} : undefined} />
      <MenuBarExtra.Item title={calWeekTitle()} onAction={highlightCalendar ? () => {} : undefined} />
      {calList.map((calRow, index) => (
        <Fragment key={"fragment_" + index}>
          <MenuBarExtra.Item
            key={"cal_" + index}
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
          {largeCalendar && index !== calList.length - 1 && <MenuBarExtra.Item key={"space_end_" + index} title={""} />}
        </Fragment>
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
