import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { getWifiList, getWifiStatus } from "./hooks/hooks";
import { EmptyView } from "./components/empty-view";
import EnterPassword from "./enter-password";
import { WifiPasswordCache } from "./types/types";
import { LocalStorageKey } from "./utils/constants";
import { PrimaryActions } from "./components/primary-actions";
import { getSignalIcon } from "./utils/common-utils";
import { RefreshWifi } from "./components/refresh-wifi";

export default function ScanWifi() {
  const { push } = useNavigation();
  const [refresh, setRefresh] = useState<number>(0);
  const { wifiPasswordCaches, publicWifi, wifiWithPasswordList, wifiList, curWifi, loading } = getWifiList(refresh);
  const { wifiStatus } = getWifiStatus();

  return (
    <List isLoading={loading} searchBarPlaceholder={"Search Wi-Fi"}>
      <EmptyView title={"No Wi-Fi"} description={wifiStatus ? " " : "Wi-Fi is turned off"} />

      {curWifi.length > 0 && curWifi[0].ssid && (
        <List.Section title={"Connected"}>
          <List.Item
            icon={{
              source: Icon.Wifi,
              tintColor: Color.Green,
            }}
            title={curWifi[0].ssid}
            subtitle={{ value: curWifi[0].security, tooltip: curWifi[0].security_flags.join(", ") }}
            accessories={[
              {
                icon: {
                  source: getSignalIcon(curWifi[0].quality),
                  tintColor: curWifi[0].quality < 40 ? Color.Red : curWifi[0].quality < 70 ? Color.Orange : Color.Green,
                },
                tooltip: curWifi[0].quality + "%",
              },
            ]}
          />
        </List.Section>
      )}

      <List.Section title={"Preferred"}>
        {wifiWithPasswordList.map((value, index) => {
          return (
            <List.Item
              icon={{
                source: Icon.Wifi,
                tintColor: curWifi.length > 0 && curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
              }}
              key={index}
              title={value.ssid}
              subtitle={{ value: value.security, tooltip: value.security_flags.join(", ") }}
              accessories={[
                {
                  icon: {
                    source: Icon.Lock,
                    tintColor: value.quality < 40 ? Color.Red : value.quality < 70 ? Color.Orange : Color.Green,
                  },
                  tooltip: value.password,
                },
                {
                  icon: {
                    source: getSignalIcon(value.quality),
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
                              const newWifiWithPasswordLis: WifiPasswordCache[] = [];
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
                  <RefreshWifi setRefresh={setRefresh} />
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
                source: Icon.Wifi,
                tintColor: curWifi.length > 0 && curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
              }}
              key={index}
              title={value.ssid}
              subtitle={{ value: value.security, tooltip: value.security_flags.join(", ") }}
              accessories={[
                {
                  icon: {
                    source: getSignalIcon(value.quality),
                    tintColor: value.quality < 40 ? Color.Red : value.quality < 70 ? Color.Orange : Color.Green,
                  },
                  tooltip: value.quality + "%",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    icon={{ source: Icon.Wifi, tintColor: Color.PrimaryText }}
                    title={"Connect Wi-Fi"}
                    onAction={() => {
                      if (curWifi.length > 0) {
                        if (curWifi[0].ssid === value.ssid) {
                          return;
                        }
                        push(
                          <EnterPassword
                            wifiPasswordCaches={wifiPasswordCaches}
                            wifiNetWork={value}
                            setRefresh={setRefresh}
                          />
                        );
                      }
                    }}
                  />
                  <Action.CopyToClipboard title={"Copy Wi-FI"} content={value.ssid} />
                  <RefreshWifi setRefresh={setRefresh} />
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
                source: Icon.Wifi,
                tintColor: curWifi.length > 0 && curWifi[0].ssid === value.ssid ? Color.Green : Color.SecondaryText,
              }}
              key={index}
              title={value.ssid}
              subtitle={{ value: value.security, tooltip: value.security_flags.join(", ") }}
              accessories={[
                {
                  icon: {
                    source: getSignalIcon(value.quality),
                    tintColor: value.quality < 40 ? Color.Red : value.quality < 70 ? Color.Orange : Color.Green,
                  },
                  tooltip: value.quality + "%",
                },
              ]}
              actions={
                <ActionPanel>
                  <PrimaryActions wifiNetwork={{ ...value, password: "" }} curWifi={curWifi} setRefresh={setRefresh} />
                  <RefreshWifi setRefresh={setRefresh} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
