import {
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { getStarTimezones } from "./hooks/hooks";
import { buildDayAndNightIcon, calculateTimeInfoByOffset, isEmpty } from "./utils/common-utils";

export default function QueryWorldTime() {
  const { starTimezones, loading } = getStarTimezones();
  return (
    <MenuBarExtra
      isLoading={loading}
      icon={{ source: { light: "world-time-menu-bar.png", dark: "world-time-menu-bar@dark.png" } }}
    >
      {starTimezones.length === 0 && <MenuBarExtra.Item title={"No star timezone"} />}
      {starTimezones.map((value) => {
        const timeInfo = calculateTimeInfoByOffset(Date.now(), value.utc_offset);
        return (
          <MenuBarExtra.Submenu
            key={value.timezone}
            icon={{
              source: {
                light: buildDayAndNightIcon(value.unixtime, true),
                dark: buildDayAndNightIcon(value.unixtime, false),
              },
            }}
            title={(isEmpty(value.alias) ? value.timezone : value.alias + "") + ": " + value.date_time}
          >
            <MenuBarExtra.Item
              icon={Icon.Geopin}
              title={"Timezone: " + value.timezone}
              onAction={async () => {
                await showHUD("Timezone is copied to clipboard");
                await Clipboard.copy(value.timezone);
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.Clock}
              title={"Date Time: " + timeInfo.dateTime}
              onAction={async () => {
                await showHUD("Date Time is copied to clipboard");
                await Clipboard.copy(timeInfo.dateTime);
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.CricketBall}
              title={"UTC Time: " + timeInfo.utc_datetime}
              onAction={async () => {
                await showHUD("UTC Time is copied to clipboard");
                await Clipboard.copy(timeInfo.utc_datetime);
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.BandAid}
              title={"UTC Offset: " + value.utc_offset}
              onAction={async () => {
                await showHUD("UTC Offset is copied to clipboard");
                await Clipboard.copy(value.utc_offset);
              }}
            />
            {!isEmpty(value.alias) && (
              <MenuBarExtra.Item
                icon={Icon.Text}
                title={"Alias: " + value.alias}
                onAction={async () => {
                  await showHUD("Alias is copied to clipboard");
                  await Clipboard.copy(value.alias + "");
                }}
              />
            )}
            {!isEmpty(value.memo) && (
              <MenuBarExtra.Item
                icon={value.memoIcon}
                title={"Memo: " + value.memo}
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
          title={"Preferences"}
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => {
            openExtensionPreferences().then();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
