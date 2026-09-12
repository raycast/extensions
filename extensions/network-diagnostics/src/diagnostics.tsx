import { List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import EthernetListItem from "./panels/ethernet";
import InternetListItem from "./panels/internet";
import LocalNetworkListItem from "./panels/local-network";
import WiFiListItem from "./panels/wifi";
import { useNetworkInfo } from "./use-network-info";

export default function Command() {
  const { networkInfo } = useNetworkInfo();

  useEffect(() => {
    for (const error of networkInfo.errors) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching network info",
        message: error.message,
      });
    }
  }, [networkInfo.errors]);

  return (
    <List isShowingDetail={true}>
      <InternetListItem networkInfo={networkInfo} />
      <LocalNetworkListItem networkInfo={networkInfo} />
      <WiFiListItem networkInfo={networkInfo} />
      <EthernetListItem networkInfo={networkInfo} />
    </List>
  );
}
