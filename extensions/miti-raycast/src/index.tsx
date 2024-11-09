import { Color, Icon, MenuBarExtra, openCommandPreferences, open } from "@raycast/api";
import { calData, calWeekTitle, getCalDateTitle, nepaliDay } from "./utils/calendar-utils";
import { CALENDAR_APP, REMINDERS_APP, SETTINGS_APP } from "./utils/constans";
import { highlightCalendar, largeCalendar, showCalendar, showReminders, showSettings } from "./types/preferences";
import { extraItemIcon, menubarIcon, menubarTitle, openApp } from "./utils/common-utils";
import { Fragment } from "react";
import { useMitiData } from "./hooks/useMitiData";

export default function Command() {
  const calList = calData();
  const { data } = useMitiData();
  return (
    <MenuBarExtra title={menubarTitle()} icon={menubarIcon()}>
      <MenuBarExtra.Item title={getCalDateTitle()} onAction={highlightCalendar ? () => {} : undefined} />
      <MenuBarExtra.Item title={calWeekTitle()} onAction={highlightCalendar ? () => {} : undefined} />
      {calList.map((calRow, index) => (
        <Fragment key={"fragment_" + index}>
          <MenuBarExtra.Item key={"cal_" + index} title={calRow} onAction={highlightCalendar ? () => {} : undefined} />
          {largeCalendar && index !== calList.length - 1 && <MenuBarExtra.Item key={"space_end_" + index} title={""} />}
        </Fragment>
      ))}
      <MenuBarExtra.Section>
        {data &&
          Array.isArray(data) &&
          data[nepaliDay - 1] &&
          "eventDetails" in data[nepaliDay - 1] &&
          Array.isArray(data[nepaliDay - 1].eventDetails) &&
          data[nepaliDay - 1].eventDetails.length > 0 &&
          data[nepaliDay - 1].eventDetails.map(
            (event: any, index: number) =>
              event.title?.np && (
                <MenuBarExtra.Item
                  key={`event-${index}`}
                  title={String(event.title.np).trim()}
                  icon={{ source: Icon.Calendar, tintColor: event.isHoliday ? Color.Red : Color.SecondaryText }}
                />
              ),
          )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Visit Miti"}
          icon={{ source: "miti.png" }}
          onAction={async () => {
            open("https://miti.bikram.io");
          }}
        />
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
