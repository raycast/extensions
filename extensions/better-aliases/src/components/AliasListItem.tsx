import { ActionPanel, Keyboard, List } from "@raycast/api";
import { deleteBetterAlias } from "../lib/betterAliases";
import { formatAlias } from "../lib/formatAlias";
import { createOpenAction } from "../lib/openAlias";
import type { BetterAliasItem, Preferences } from "../types";
import { CopyActions, DeleteAction, EditAction, ViewAction } from "./actions";
import { EditAliasForm } from "./EditAliasForm";

interface AliasListItemProps {
  alias: string;
  item: BetterAliasItem;
  preferences: Preferences;
  searchText: string;
  onSelect?: () => void;
  onDelete?: () => void;
}

export function AliasListItem({ alias, item, preferences, searchText, onSelect, onDelete }: AliasListItemProps) {
  const displayAlias = formatAlias(alias, !!preferences.showFullAlias, searchText);
  const openAction = createOpenAction(item.value, "Open", Keyboard.Shortcut.Common.Open);

  return (
    <List.Item
      title={displayAlias}
      subtitle={item.label || item.value}
      accessories={preferences.hideAccessories ? undefined : [{ text: item.value }]}
      actions={
        <ActionPanel>
          <CopyActions alias={alias} value={item.value} onCopy={onSelect} />
          <EditAction alias={alias} item={item} itemType="alias" EditComponent={EditAliasForm} />
          <ViewAction alias={alias} item={item} itemType="alias" />
          <DeleteAction
            itemName={alias}
            itemType="alias"
            onDelete={() => deleteBetterAlias(alias)}
            onSuccess={onDelete}
          />
          {openAction}
        </ActionPanel>
      }
    />
  );
}
