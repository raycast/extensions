import { ha } from "@lib/common";
import { getErrorMessage } from "@lib/utils";
import { getWifiSSIDSync } from "@lib/wifi";
import { Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

export default function ConnectionCommand() {
  const { error, isLoading, nearestURL } = useConnection();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return (
    <List isLoading={isLoading}>
      <List.Section title="Connection">
        <List.Item
          title="Chosen URL"
          icon={Icon.ArrowsContract}
          accessories={[
            { icon: { source: nearestURL === ha.urlInternal ? Icon.House : "", tintColor: Color.Yellow } },
            { text: nearestURL },
          ]}
        />
      </List.Section>
      <List.Section title="URLs">
        <List.Item title="URL" icon={Icon.AtSymbol} accessories={[{ text: ha.url }]} />
        <List.Item title="Internal URL" icon={Icon.House} accessories={[{ text: ha.urlInternal || "-" }]} />
      </List.Section>
      <List.Section title="Wi-Fi">
        <List.Item
          title="Home Wi-Fi SSIDs"
          icon={Icon.Network}
          accessories={[{ text: ha.wifiSSIDs?.join(",") || "undefined" }]}
        />
        <List.Item title="Current Wi-Fi SSID" icon={Icon.Wifi} accessories={[{ text: getWifiSSIDSync() || "-" }]} />
      </List.Section>
    </List>
  );
}

function useConnection(): {
  error?: string;
  isLoading: boolean;
  nearestURL?: string;
} {
  const [nearestURL, setNearestURL] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const nearestURLRaw = await ha.nearestURL();
        if (!didUnmount) {
          setNearestURL(nearestURLRaw);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, []);

  return { error, isLoading, nearestURL };
}
