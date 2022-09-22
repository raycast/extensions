import { ActionPanel, Action, Icon, List, showHUD, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import DNS_LIST from "./config";
import { DNSItem } from "./types/types";
import { switchDNS, getCurrentDNS } from "./utils/utils";

export default function Command() {
  const [currentDNS, setCurrentDNS] = useState("__unknown__");
  const [loading, setLoading] = useState(false);

  const action = async (item: DNSItem) => {
    showHUD("DNS changing...");

    const dns = await switchDNS(item.dns);

    setCurrentDNS(item.dns);
    popToRoot({ clearSearchBar: false });
    showHUD("DNS changed to " + dns);
  };

  useEffect(() => {
    setLoading(true);
    getCurrentDNS()
      .then((dns) => {
        setCurrentDNS(dns);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <List isLoading={loading}>
      {DNS_LIST.map((item) => (
        <List.Item
          key={item.title}
          icon={item.dns === currentDNS ? { source: Icon.CheckCircle, tintColor: "#52C41A" } : "list-icon.png"}
          title={item.title}
          subtitle={item.dns}
          accessories={[{ icon: Icon.Info, text: item.dns === currentDNS ? "Current DNS" : item.accessory }]}
          actions={
            <ActionPanel>
              <Action title="Apply" onAction={() => action(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
