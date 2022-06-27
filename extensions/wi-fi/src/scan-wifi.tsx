import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState } from "react";
import { getWifiList } from "./hooks/hooks";
import { EmptyView } from "./components/empty-view";
import EnterPassword from "./enter-password";
import wifi from "node-wifi";
import { WifiPassword } from "./types/types";
import { LocalStorageKey } from "./utils/constants";
import Style = Toast.Style;

export default function SearchAllBunches() {
  const { push } = useNavigation();
  const [refresh, setRefresh] = useState<number>(0);
  const { wifiPassword, wifiWithPasswordList, wifiList, curWifi, loading } = getWifiList(refresh);

  return (
    <List isLoading={loading} searchBarPlaceholder={"Search Wi-Fi"}>
      <EmptyView title={"No Wi-Fi"} />
      <List.Section title={"Preferred"}>
        {wifiWithPasswordList.map((value, index) => {
          return (
            <List.Item
              icon={{
                source: "wifi-icon.svg",
                tintColor: curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
              }}
              key={index}
              title={value.ssid}
              subtitle={{ value: value.security, tooltip: value.security_flags.join(", ") }}
              accessories={[
                {
                  icon: {
                    source: Icon.LevelMeter,
                    tintColor: value.quality < 40 ? Color.Red : value.quality < 70 ? Color.Orange : Color.Green,
                  },
                  tooltip: value.quality + "%",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    icon={{ source: "wifi-icon.svg", tintColor: Color.PrimaryText }}
                    title={"Connect Wi-Fi"}
                    onAction={async () => {
                      if (curWifi[0].ssid === value.ssid) {
                        return;
                      }
                      const toast = await showToast(Style.Animated, "Connecting...");
                      wifi.connect(
                        {
                          ssid: value.ssid,
                          password: value.password,
                        },
                        async () => {
                          setRefresh(Date.now());
                          const curWifi = await wifi.getCurrentConnections();
                          if (curWifi[0].ssid === value.ssid) {
                            await showHUD(`Connected to ${value.ssid} successfully`);
                            await toast.hide();
                          } else {
                            await showToast(Style.Failure, "Failure to connect");
                          }
                        }
                      );
                    }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title={"Remove Wi-Fi"}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      const newWifiWithPasswordLis: WifiPassword[] = [];
                      wifiWithPasswordList.forEach((w) => {
                        if (w.ssid !== value.ssid) {
                          newWifiWithPasswordLis.push(w);
                        }
                      });
                      await LocalStorage.setItem(LocalStorageKey.WIFI_PASSWORD, JSON.stringify(newWifiWithPasswordLis));
                      setRefresh(Date.now());
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title={wifiWithPasswordList.length === 0 ? "Wi-Fi" : "Other"}>
        {wifiList.map((value, index) => {
          return (
            <List.Item
              icon={{
                source: "wifi-icon.svg",
                tintColor: curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
              }}
              key={index}
              title={value.ssid}
              subtitle={{ value: value.security, tooltip: value.security_flags.join(", ") }}
              accessories={[
                {
                  icon: {
                    source: Icon.LevelMeter,
                    tintColor: value.quality < 40 ? Color.Red : value.quality < 70 ? Color.Orange : Color.Green,
                  },
                  tooltip: value.quality + "%",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    icon={{ source: "wifi-icon.svg", tintColor: Color.PrimaryText }}
                    title={"Connect Wi-Fi"}
                    onAction={() => {
                      if (curWifi[0].ssid === value.ssid) {
                        return;
                      }
                      push(<EnterPassword wifiPassword={wifiPassword} wifiNetWork={value} setRefresh={setRefresh} />);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
