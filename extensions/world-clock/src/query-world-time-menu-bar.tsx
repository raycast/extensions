import {
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { calculateTimeInfoByOffset, formatMenubarDate, getMenubarAvatar, isEmpty } from "./utils/common-utils";
import { useMemo } from "react";
import { showFirstTimezone } from "./types/preferences";
import { useStarTimezones } from "./hooks/useStarTimezones";

export default function QueryWorldTime() {
  const { data: starTimezonesData, isLoading } = useStarTimezones();

  const starTimezones = Array.isArray(starTimezonesData) ? starTimezonesData : [];

  const menubarTitle = useMemo(() => {
    if (showFirstTimezone && starTimezones.length > 0) {
      const timeInfo = calculateTimeInfoByOffset(Date.now(), starTimezones[0].utc_offset);
      const title = isEmpty(starTimezones[0].alias) ? starTimezones[0].timezone : starTimezones[0].alias + "";
      return title + " " + formatMenubarDate(timeInfo.dateRaw);
    } else {
      return "";
    }
  }, [starTimezones]);

  const menubarIcon = useMemo(() => {
    if (showFirstTimezone && starTimezones.length > 0) {
      return getMenubarAvatar(starTimezones[0]);
    } else {
      return Icon.Globe;
    }
  }, [starTimezones]);

  return (
    <MenuBarExtra isLoading={isLoading} icon={menubarIcon} title={menubarTitle}>
      {starTimezones.length === 0 && <MenuBarExtra.Item title={"No star timezone"} />}
      {starTimezones.map((value, index) => {
        const timeInfo = calculateTimeInfoByOffset(Date.now(), value.utc_offset);
        return (
          <MenuBarExtra.Submenu
            key={value.timezone + index}
            icon={getMenubarAvatar(value)}
            title={(isEmpty(value.alias) ? value.timezone : value.alias + "") + "   " + value.date_time}
          >
            <MenuBarExtra.Item
              icon={Icon.Geopin}
              title={"Timezone"}
              subtitle={value.timezone}
              onAction={async () => {
                await showHUD("Timezone is copied to clipboard");
                await Clipboard.copy(value.timezone);
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.Clock}
              title={"Date Time"}
              subtitle={timeInfo.dateTime}
              onAction={async () => {
                await showHUD("Date Time is copied to clipboard");
                await Clipboard.copy(timeInfo.dateTime);
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.CricketBall}
              title={"UTC Time"}
              subtitle={timeInfo.utc_datetime}
              onAction={async () => {
                await showHUD("UTC Time is copied to clipboard");
                await Clipboard.copy(timeInfo.utc_datetime);
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.BandAid}
              title={"UTC Offset"}
              subtitle={value.utc_offset}
              onAction={async () => {
                await showHUD("UTC Offset is copied to clipboard");
                await Clipboard.copy(value.utc_offset);
              }}
            />
            {!isEmpty(value.alias) && (
              <MenuBarExtra.Item
                icon={Icon.Text}
                title={"Alias"}
                subtitle={value.alias}
                onAction={async () => {
                  await showHUD("Alias is copied to clipboard");
                  await Clipboard.copy(value.alias + "");
                }}
              />
            )}
            {!isEmpty(value.memo) && (
              <MenuBarExtra.Item
                icon={value.memoIcon}
                title={"Memo"}
                subtitle={value.memo}
                onAction={async () => {
                  await showHUD("Memo is copied to clipboard");
                  await Clipboard.copy(value.memo + "");
                }}
              />
            )}
          </MenuBarExtra.Submenu>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Query World Time"}
          icon={Icon.Clock}
          shortcut={{ modifiers: ["cmd"], key: "k" }}
          onAction={async () => {
            await launchCommand({ name: "query-world-time", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings..."}
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => {
            openCommandPreferences().then();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
