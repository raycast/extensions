import { Clipboard, Icon, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import { useCurWifi } from "./hooks/hooks";
import { getSignalIcon, getSignalIconColor, getSignalTitle, toggleWifi } from "./utils/common-utils";
import { showColorfulSignal } from "./types/preferences";

export default function WifiSignal() {
  const { curWifi, loading } = useCurWifi();
  const title = getSignalTitle(curWifi);
  const icon = {
    source: getSignalIcon(curWifi?.quality),
    tintColor: showColorfulSignal ? getSignalIconColor(curWifi?.quality) : undefined,
  };

  return (
    <MenuBarExtra title={title} icon={icon} isLoading={loading}>
      {curWifi !== undefined && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={"Wi-Fi"}
            subtitle={curWifi?.ssid}
            icon={Icon.Wifi}
            onAction={() => {
              Clipboard.copy(curWifi?.ssid + "").then(() => showHUD("Wi-Fi Copied"));
            }}
          />
          <MenuBarExtra.Item
            title={"Quality"}
            subtitle={curWifi?.quality.toString()}
            icon={Icon.LevelMeter}
            onAction={() => {
              Clipboard.copy(curWifi?.quality + "").then(() => showHUD("Quality Copied"));
            }}
          />
          <MenuBarExtra.Item
            title={"Security"}
            subtitle={curWifi?.security}
            icon={Icon.Lock}
            onAction={() => {
              Clipboard.copy(curWifi?.security + "").then(() => showHUD("Security Copied"));
            }}
          />
          <MenuBarExtra.Item
            title={"Channel"}
            subtitle={curWifi?.channel.toString()}
            icon={Icon.Livestream}
            onAction={() => {
              Clipboard.copy(curWifi?.channel + "").then(() => showHUD("Channel Copied"));
            }}
          />
          <MenuBarExtra.Item
            title={"Frequency"}
            subtitle={curWifi?.frequency.toString()}
            icon={Icon.Heartbeat}
            onAction={() => {
              Clipboard.copy(curWifi?.frequency + "").then(() => showHUD("Frequency Copied"));
            }}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Toggle Wi-Fi"}
          icon={curWifi === undefined ? Icon.Wifi : Icon.WifiDisabled}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            await toggleWifi();
          }}
        />
        <MenuBarExtra.Item
          title={"Preferences"}
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => {
            openCommandPreferences().then(() => null);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
