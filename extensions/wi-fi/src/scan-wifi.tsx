import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { getWifiList, getWifiStatus } from "./hooks/hooks";
import { EmptyView } from "./components/empty-view";
import EnterPassword from "./enter-password";
import { WifiPassword } from "./types/types";
import { LocalStorageKey } from "./utils/constants";
import { PrimaryActions } from "./components/primary-actions";

export default function ScanWifi() {
  const { push } = useNavigation();
  const [refresh, setRefresh] = useState<number>(0);
  const { wifiPassword, publicWifi, wifiWithPasswordList, wifiList, curWifi, loading } = getWifiList(refresh);
  const { wifiStatus } = getWifiStatus();

  return (
    <List isLoading={loading} searchBarPlaceholder={"Search Wi-Fi"}>
      <EmptyView title={"No Wi-Fi"} description={wifiStatus ? " " : "Wi-Fi is turned off"} />

      <List.Section title={"Preferred"}>
        {wifiWithPasswordList.map((value, index) => {
          return (
            <List.Item
              icon={{
                source: "wifi-icon.svg",
                tintColor: curWifi.length > 0 && curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
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
                  <PrimaryActions wifiNetwork={value} curWifi={curWifi} setRefresh={setRefresh} />

                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title={"Copy Password"}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
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
                tintColor: curWifi.length > 0 && curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
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
                      if (curWifi.length > 0) {
                        if (curWifi[0].ssid === value.ssid) {
                          return;
                        }
                        push(<EnterPassword wifiPassword={wifiPassword} wifiNetWork={value} setRefresh={setRefresh} />);
                      }
                    }}
                  />
                  <Action.CopyToClipboard title={"Copy Wi-FI"} content={value.ssid} />
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
                tintColor: curWifi.length > 0 && curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
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
                  <PrimaryActions wifiNetwork={{ ...value, password: "" }} curWifi={curWifi} setRefresh={setRefresh} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
