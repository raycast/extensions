import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import { Vault } from "../types";
import { CommandLineMissingError, useVaults } from "../utils";
import { Error as ErrorGuide } from "./Error";
import { LoadError } from "./LoadError";
import { VaultActionPanel } from "./VaultActionPanel";

export function Items() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const { data: items, error: itemsError, isLoading: itemsIsLoading, revalidate: revalidateItems } = useVaults();

  useMemo(() => {
    if (!items) return;
    setVaults(items);
  }, [items]);

  if (itemsError instanceof CommandLineMissingError) return <ErrorGuide />;

  if (itemsError) {
    return <LoadError error={itemsError} isLoading={itemsIsLoading} onRetry={revalidateItems} />;
  }

  return (
    <List isLoading={itemsIsLoading}>
      <List.EmptyView
        description="Any vaults you have added in 1Password app will be listed here."
        icon="1password-noview.png"
        title="No items found"
      />
      <List.Section subtitle={`${vaults?.length}`} title="Vaults">
        {vaults?.length &&
          vaults.map((item) => (
            <List.Item
              actions={<VaultActionPanel vault={item} />}
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
