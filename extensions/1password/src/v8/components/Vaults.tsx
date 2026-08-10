import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import { Vault } from "../types";
import { CommandLineMissingError, ConnectionError, ExtensionError, useAccount, useVaults } from "../utils";
import { Error as ErrorGuide } from "./Error";
import { VaultActionPanel } from "./VaultActionPanel";

export function Items() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const { data: account, error: accountError, isLoading: accountIsLoading } = useAccount();
  const { data: items, error: itemsError, isLoading: itemsIsLoading } = useVaults();

  useMemo(() => {
    if (!items) return;
    setVaults(items);
  }, [items]);

  if (itemsError instanceof CommandLineMissingError || accountError instanceof CommandLineMissingError)
    return <ErrorGuide />;

  if (itemsError instanceof ConnectionError || accountError instanceof ConnectionError) {
    return (
      <List>
        <List.EmptyView
          description={itemsError?.message || accountError?.message}
          icon={Icon.WifiDisabled}
          title={(itemsError as ExtensionError)?.title || (accountError as ExtensionError)?.title}
        />
      </List>
    );
  }

  return (
    <List isLoading={itemsIsLoading || accountIsLoading}>
      <List.EmptyView
        description="Any vaults you have added in 1Password app will be listed here."
        icon="1password-noview.png"
        title="No items found"
      />
      <List.Section subtitle={`${vaults?.length}`} title="Vaults">
        {vaults?.length &&
          vaults.map((item) => (
            <List.Item
              actions={<VaultActionPanel account={account} vault={item} />}
              icon={{
                tooltip: "Vault",
                value: { source: Icon.Folder, tintColor: Color.Blue },
              }}
              id={item.id}
              key={item.id}
              title={item.name}
            />
          ))}
      </List.Section>
    </List>
  );
}
