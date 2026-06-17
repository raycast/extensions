import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { deleteBetterAlias } from "../lib/betterAliases";
import { formatAlias } from "../lib/formatAlias";
import { createOpenAction } from "../lib/openAlias";
import type { BetterAliasItem, Preferences } from "../schemas";
import { CopyActions, DeleteAction, EditAction, PasteAction, ViewAction } from "./actions";
import { handleOpenItems } from "./actions/OpenItems";
import { EditAliasForm } from "./EditAliasForm";

interface AliasListItemProps {
  alias: string;
  item: BetterAliasItem;
  preferences: Preferences;
  searchText: string;
  primaryActionType?: "open" | "paste";
  onSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  allFilteredItems?: [string, BetterAliasItem][];
}

export function AliasListItem({
  alias,
  item,
  preferences,
  searchText,
  primaryActionType = "open",
  onSelect,
  onOpen,
  onDelete,
  allFilteredItems,
}: AliasListItemProps) {
  const displayAlias = formatAlias(alias, !!preferences.showFullAlias, searchText);
  const openAction = createOpenAction(item.value, "Open", Keyboard.Shortcut.Common.Open, onOpen);
  const pasteAction = (
    <PasteAction
      value={item.value}
      randomizedSnippetSeparator={preferences.randomizedSnippetSeparator}
      onPaste={onSelect}
    />
  );

  return (
    <List.Item
      title={displayAlias}
      subtitle={item.label || item.value}
      accessories={preferences.hideAccessories ? undefined : [{ text: item.value }]}
      actions={
        <ActionPanel>
          {primaryActionType === "paste" ? (
            <>
              {pasteAction}
              {openAction}
            </>
          ) : (
            <>
              {openAction}
              {pasteAction}
            </>
          )}

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
          {/* Open All Filtered */}
          {allFilteredItems && allFilteredItems.length > 1 && (
            <Action
              title="Open All Filtered"
              icon={Icon.ArrowsExpand}
              shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
              onAction={() => handleOpenItems(allFilteredItems)}
            />
          )}
          {/* Open by Slice */}
          {allFilteredItems &&
            [1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              if (num > allFilteredItems.length) return null;
              return (
                <Action
                  key={num}
                  title={`Open First ${num} ${num === 1 ? "Item" : "Items"}`}
                  icon={Icon.ArrowRight}
                  shortcut={{
                    modifiers: ["opt", "shift"],
                    key: String(num) as Keyboard.KeyEquivalent,
                  }}
                  onAction={() => handleOpenItems(allFilteredItems, num)}
                />
              );
            })}
        </ActionPanel>
      }
    />
  );
}
