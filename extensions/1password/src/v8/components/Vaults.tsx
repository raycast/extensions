import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { Vault } from "../types";
import { useVaults, useAccount, CommandLineMissingError, ConnectionError, ExtensionError } from "../utils";
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
          title={(itemsError as ExtensionError)?.title || (accountError as ExtensionError)?.title}
          description={itemsError?.message || accountError?.message}
          icon={Icon.WifiDisabled}
        />
      </List>
    );
  }

  return (
    <List isLoading={itemsIsLoading || accountIsLoading}>
      <List.EmptyView
        title="No items found"
        icon="1password-noview.png"
        description="Any vaults you have added in 1Password app will be listed here."
      />
      <List.Section title="Vaults" subtitle={`${vaults?.length}`}>
        {vaults?.length &&
          vaults.map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              icon={{
                value: { source: Icon.Folder, tintColor: Color.Blue },
                tooltip: "Vault",
              }}
              title={item.name}
              actions={<VaultActionPanel account={account} vault={item} />}
            />
          ))}
      </List.Section>
    </List>
  );
}
