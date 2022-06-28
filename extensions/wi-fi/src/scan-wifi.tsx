import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
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
  const { wifiPassword, publicWifi, wifiWithPasswordList, wifiList, curWifi, loading } = getWifiList(refresh);

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
                    source: "password.svg",
                    tintColor: Color.Brown,
                  },
                  tooltip: value.password,
                },
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
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title={"Copy Wi-FI"}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      content={value.ssid}
                    />
                    <Action.CopyToClipboard
                      title={"Copy Password"}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
                      content={value.password}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Trash}
                      title={"Remove Wi-Fi"}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        const options: Alert.Options = {
                          icon: Icon.Trash,
                          title: "Remove Wi-Fi",
                          message: `Are you sure you want to remove ${value.ssid}?`,
                          primaryAction: {
                            title: "Remove",
                            onAction: () => {
                              const newWifiWithPasswordLis: WifiPassword[] = [];
                              wifiWithPasswordList.forEach((w) => {
                                if (w.ssid !== value.ssid) {
                                  newWifiWithPasswordLis.push(w);
                                }
                              });
                              LocalStorage.setItem(
                                LocalStorageKey.WIFI_PASSWORD,
                                JSON.stringify(newWifiWithPasswordLis)
                              );
                              setRefresh(Date.now());
                            },
                          },
                        };
                        await confirmAlert(options);
                      }}
                    />
                  </ActionPanel.Section>
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
                  <Action.CopyToClipboard
                    title={"Copy Wi-FI"}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    content={value.ssid}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title={"Public"}>
        {publicWifi.map((value, index) => {
          return (
            <List.Item
              icon={{
                source: "wifi-icon.svg",
                tintColor: curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
              }}
              key={index}
              title={value.ssid}
              subtitle={{ value: value.security, tooltip: value.security_flags.join(", ") }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title={"Copy Wi-FI"}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      content={value.ssid}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
