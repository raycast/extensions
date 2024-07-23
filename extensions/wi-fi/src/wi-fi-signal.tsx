import { Clipboard, Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { toggleWifi } from "./utils/common-utils";
import { useWifiStatus } from "./hooks/useWifiStatus";
import { useMemo } from "react";
import { useWifiInfo } from "./hooks/useWifiInfo";
import { useWifiName } from "./hooks/useWifiName";
import { showWifiName } from "./types/preferences";

export default function WifiSignal() {
  const { data: wifiInfoData, isLoading: wifiInfoLoading } = useWifiInfo();
  const { data: wifiNameData, isLoading: wifiNameLoading } = useWifiName();
  const { data: wifiStatusData, isLoading: wifiStatusLoading } = useWifiStatus();

  const icon = useMemo(() => {
    const wifiStatus = wifiStatusData || false;
    return wifiStatus ? Icon.Wifi : Icon.WifiDisabled;
  }, [wifiStatusData]);

  const toggleIcon = useMemo(() => {
    const wifiStatus = wifiStatusData || false;
    return wifiStatus ? Icon.WifiDisabled : Icon.Wifi;
  }, [wifiStatusData]);

  const wifiInfo = useMemo(() => {
    return wifiInfoData || [];
  }, [wifiInfoData]);

  const wifiName = useMemo(() => {
    return wifiNameData || "";
  }, [wifiNameData]);

  return (
    <MenuBarExtra
      title={showWifiName ? wifiName : undefined}
      icon={icon}
      isLoading={wifiStatusLoading || wifiInfoLoading || wifiNameLoading}
    >
      <MenuBarExtra.Section>
        {wifiInfo.map((info) => {
          return (
            <MenuBarExtra.Item
              title={info.key}
              subtitle={info.value}
              onAction={async () => {
                await Clipboard.copy(info.value);
              }}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Toggle Wi-Fi"}
          icon={toggleIcon}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            await toggleWifi();
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings"}
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
