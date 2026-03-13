import { useEffect, useState } from "react";
import { Detail, Icon, Action, ActionPanel, List } from "@raycast/api";
import { removeAddress, loadAddresses } from "./service/addresses";

export default function Main() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  function removeAddressFromList(address: string) {
    removeAddress(address)
      .then((addresses: string[]) => {
        if (addresses) {
          setAddresses(addresses);
        }
      })
      .catch(() => {
        console.log("do nothing...");
      });
  }

  useEffect(() => {
    loadAddresses().then((d) => setAddresses(d));
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Delete selected address...">
      <List.EmptyView
        icon="no-view.png"
        title="No Addresses Added"
        description={`Use the Add Address command to add`}
      />
      {addresses.length != 0 &&
        addresses.map((item) => (
          <List.Item
            key={item}
            title={item}
            icon={Icon.Wallet}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Address"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => removeAddressFromList(`${item}`)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
