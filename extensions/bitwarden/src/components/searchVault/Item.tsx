import { List } from "@raycast/api";
import { useMemo } from "react";
import VaultItemActionPanel from "~/components/searchVault/ItemActionPanel";
import VaultItemContext from "~/components/searchVault/context/vaultItem";
import { useItemAccessories } from "~/components/searchVault/utils/useItemAccessories";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
import { Folder, Item } from "~/types/vault";
import { extractKeywords } from "~/utils/search";

export type VaultItemProps = {
  item: Item;
  folder: Folder | undefined;
};

const VaultItem = ({ item, folder }: VaultItemProps) => {
  const icon = useItemIcon(item);
  const accessories = useItemAccessories(item, folder);
  const keywords = useMemo(() => extractKeywords(item), [item]);

  return (
    <VaultItemContext.Provider value={item}>
      <List.Item
        id={item.id}
        title={item.name}
        keywords={keywords}
        accessories={accessories}
        icon={icon}
        subtitle={item.login?.username || undefined}
        actions={<VaultItemActionPanel />}
      />
    </VaultItemContext.Provider>
  );
};

export default VaultItem;
