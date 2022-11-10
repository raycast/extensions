import { useEffect, useState } from "react";
import { Detail, Icon, Action, ActionPanel, List } from "@raycast/api";
import { removeAddress, loadAddresses } from "./service/addresses";

export default function Main() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  function removeAddressFromList(address: string) {
    removeAddress(address).then((addresses: string[]) => {
      if (addresses) {
        setAddresses(addresses);
      }
    });
  }

  useEffect(() => {
    loadAddresses().then((d) => setAddresses(d));
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  if (addresses.length == 0) {
    return <Detail markdown="No addresses added right now. use the `add address` command first" />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Delete selected address...">
      {addresses.length != 0 &&
        addresses.map((item) => (
          <List.Item
            key={item}
            title={item}
            icon={Icon.Wallet}
            actions={
              <ActionPanel>
                <Action title="Delete address" onAction={() => removeAddressFromList(`${item}`)} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
