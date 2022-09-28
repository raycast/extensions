import { ActionPanel, Action, Icon, List, confirmAlert, showHUD, popToRoot, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import Edit from "./components/edit";
import DEFAULT_DNS from "./config";
import { DNSItem } from "./types/types";
import { switchDNS, getCurrentDNS, useSudo } from "./utils/utils";
import StorageUtils from "./utils/storage-utils";

export default function Command() {
  const [currentDNS, setCurrentDNS] = useState("__unknown__");
  const [loading, setLoading] = useState(false);
  const [customDNS, setCustomDNS] = useState<DNSItem[]>([]);

  const apply = async (item: DNSItem) => {
    const { error, data } = await switchDNS(item.dns);

    if (error) {
      if (useSudo) {
        showHUD(`Failed: ${error}`);
      } else {
        showToast({
          title: "Failed",
          message: `Enable "Use Sudo" in the Extension Preferences and try again.`,
          style: Toast.Style.Failure,
        });
      }
    } else {
      setCurrentDNS(item.dns);
      popToRoot({ clearSearchBar: false });
      showHUD("DNS changed to " + data);
    }
  };

  const loadCustom = async () => {
    const values = await StorageUtils.listDNS();
    const list = Object.values(values).map((str) => JSON.parse(str));
    setCustomDNS(list);
    return list;
  };

  const del = async (item: DNSItem) => {
    if (await confirmAlert({ title: `Delete DNS:${item.title}?` })) {
      await StorageUtils.deleteDNS(item);
      await loadCustom();
    }
  };

  const ListItem = (props: { data: DNSItem; isCustom?: boolean }) => {
    const item = props.data;
    return (
      <List.Item
        icon={item.dns === currentDNS ? { source: Icon.CheckCircle, tintColor: "#52C41A" } : "list-icon.png"}
        title={item.title}
        subtitle={item.dns}
        accessories={[{ icon: Icon.Info, text: item.dns === currentDNS ? "Current DNS" : item.accessory }]}
        actions={
          <ActionPanel>
            <Action title="Apply" onAction={() => apply(item)} />
            <Action.Push
              title="Add"
              target={
                <Edit
                  afterPop={() => {
                    loadCustom();
                  }}
                />
              }
            />
            {props.isCustom && (
              <Action title="Delete" shortcut={{ modifiers: ["cmd"], key: "delete" }} onAction={() => del(item)} />
            )}
          </ActionPanel>
        }
      />
    );
  };

  useEffect(() => {
    setLoading(true);

    loadCustom().then(() => {
      getCurrentDNS()
        .then((dns) => {
          setCurrentDNS(dns);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  return (
    <List isLoading={loading}>
      {customDNS.map((item) => (
        <ListItem key={item.title} isCustom data={item} />
      ))}

      {DEFAULT_DNS.map((item) => (
        <ListItem key={item.title} data={item} />
      ))}
    </List>
  );
}
