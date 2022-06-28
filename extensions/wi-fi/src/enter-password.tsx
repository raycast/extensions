import {
  Action,
  ActionPanel,
  Color,
  Form,
  LocalStorage,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { Dispatch, SetStateAction, useState } from "react";
import wifi, { WiFiNetwork } from "node-wifi";
import Style = Toast.Style;
import { WifiPassword } from "./types/types";
import { LocalStorageKey } from "./utils/constants";

export default function EnterPassword(props: {
  wifiPassword: WifiPassword[];
  wifiNetWork: WiFiNetwork;
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { wifiPassword, wifiNetWork, setRefresh } = props;
  const [password, setPassword] = useState<string>("");

  return (
    <Form
      navigationTitle={"Enter Password"}
      actions={
        <ActionPanel>
          <Action
            icon={{ source: "wifi-icon.svg", tintColor: Color.PrimaryText }}
            title={"Connect Wi-Fi"}
            onAction={async () => {
              const toast = await showToast(Style.Animated, "Connecting...");
              wifi.connect({ ssid: wifiNetWork.ssid, password: password }, async () => {
                setRefresh(Date.now());
                const curWifi = await wifi.getCurrentConnections();
                if (curWifi[0].ssid === wifiNetWork.ssid) {
                  let isCache = false;
                  const newWifiWithPassword = wifiPassword.map((value) => {
                    if (value.ssid === wifiNetWork.ssid) {
                      isCache = true;
                      value.password = password;
                    }
                    return value;
                  });
                  if (!isCache) {
                    newWifiWithPassword.push({ ssid: wifiNetWork.ssid, password: password });
                  }
                  await LocalStorage.setItem(LocalStorageKey.WIFI_PASSWORD, JSON.stringify(newWifiWithPassword));
                  await showHUD(`Connected to ${wifiNetWork.ssid} successfully`);
                  await toast.hide();
                  await popToRoot();
                } else {
                  await showToast(Style.Failure, "Failure to connect");
                }
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={"Wi-FI"} text={wifiNetWork.ssid} />
      <Form.TextField id={"password"} title={"Password"} value={password} onChange={setPassword} />
    </Form>
  );
}
