import { Action, ActionPanel, List, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { VirtualNetwork, getVirtualNetworks, switchVirtualNetwork } from "./lib";

const ListItem = ({
  virtualNetwork,
  onSwitchVirtualNetwork,
}: {
  virtualNetwork: VirtualNetwork;
  onSwitchVirtualNetwork: (id: string) => void;
}) => {
  const accessories = [];
  if (virtualNetwork.active) {
    accessories.push({ text: "Active" });
  }
  if (virtualNetwork.default) {
    accessories.push({ text: "Default" });
  }

  return (
    <List.Item
      key={virtualNetwork.id}
      id={virtualNetwork.id}
      title={virtualNetwork.name}
      subtitle={virtualNetwork.description}
      actions={
        <ActionPanel title="Actions">
          <Action onAction={() => onSwitchVirtualNetwork(virtualNetwork.id)} title="Switch" />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
};

export default () => {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<VirtualNetwork[]>([]);

  useEffect(() => {
    setIsLoading(true);
    getVirtualNetworks()
      .then((res) => setItems(res))
      .then(() => setIsLoading(false));
  }, []);

  const onSwitchVirtualNetwork = async (id: string) => {
    const result = await switchVirtualNetwork(id);
    if (result) {
      await showHUD("Switched Virtual Network", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch Virtual Network",
      });
    }
  };
  if (!isLoading && items.length === 0) {
    return (
      <List searchBarPlaceholder="Search Virtual Networks" isLoading={isLoading}>
        <List.EmptyView title="No Virtual Networks found" />;
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search Virtual Networks" isLoading={isLoading}>
      {items.map((item: VirtualNetwork) => (
        <ListItem key={item.id} virtualNetwork={item} onSwitchVirtualNetwork={onSwitchVirtualNetwork} />
      ))}
    </List>
  );
};
