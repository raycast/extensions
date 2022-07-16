import { Action, ActionPanel, Color } from "@raycast/api";
import { WiFiNetwork } from "node-wifi";
import { connectWifi } from "../utils/common-utils";
import React, { Dispatch, SetStateAction } from "react";
import { WifiNetworkWithPassword } from "../types/types";

export function PrimaryActions(props: {
  wifiNetwork: WifiNetworkWithPassword;
  curWifi: WiFiNetwork[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { wifiNetwork, curWifi, setRefresh } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={{ source: "wifi-icon.svg", tintColor: Color.PrimaryText }}
        title={"Connect Wi-Fi"}
        onAction={async () => {
          if (curWifi.length > 0) {
            if (curWifi[0].ssid === wifiNetwork.ssid) {
              return;
            }
            await connectWifi(wifiNetwork.ssid, wifiNetwork.password, setRefresh);
          }
        }}
      />
      <Action.CopyToClipboard title={"Copy Wi-FI"} content={wifiNetwork.ssid} />
    </ActionPanel.Section>
  );
}
