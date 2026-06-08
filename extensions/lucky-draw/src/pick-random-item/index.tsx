import { Action, ActionPanel, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";

import pickRandomItem, { removeItemAtIndex, sanitizeItem } from "./pick-random-item";
import type { PickRandomItemResultProps } from "./types";

function PickRandomItemResult({ onReset, value }: PickRandomItemResultProps) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={value} title="Copy Item" />
          <Action title="Pick Again" onAction={onReset} />
        </ActionPanel>
      }
      markdown={`# ${value}`}
    />
  );
}

export default function PickRandomItemCommand() {
  const [searchText, setSearchText] = useState<string>("");
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [useDefaultList, setUseDefaultList] = useState<boolean>(false);
  const [value, setValue] = useState<string | null>(null);

  async function handleAddItem() {
    const sanitizedItem = sanitizeItem(searchText);

    if (sanitizedItem.length === 0) {
      await showToast({
        message: "Type an item before pressing Enter.",
        style: Toast.Style.Failure,
        title: "No item to add",
      });
      return;
    }
    if (customItems.includes(sanitizedItem)) {
      await showToast({
        message: "Item already exists.",
        style: Toast.Style.Failure,
        title: "Item already exists",
      });
      return;
    }
    setCustomItems((previousItems) => [...previousItems, sanitizedItem]);
    setSearchText("");
  }

  async function handlePickRandomItem() {
    const items = customItems;

    if (items.length === 0) {
      await showToast({
        message: "Add at least one item or enable a populated default list.",
        style: Toast.Style.Failure,
        title: "No items found",
      });
      return;
    }

    setValue(pickRandomItem({ items }) ?? null);
  }

  function handleRemoveItem(index: number) {
    setCustomItems((previousItems) => removeItemAtIndex(previousItems, index));
  }

  function toggleDefaultList() {
    setUseDefaultList((currentValue) => !currentValue);
  }

  if (value !== null) {
    return <PickRandomItemResult onReset={() => setValue(null)} value={value} />;
  }

  const allItems = customItems;
  const addItemTitle = searchText.length > 0 ? `Add "${searchText}"` : "Type an item to add";
  const defaultListStatus = useDefaultList ? "On" : "Off";

  return (
    <List
      filtering={false}
      navigationTitle="Pick Random Item"
      onSearchTextChange={setSearchText}
      // Keep Enter bound to the composer row while the user is typing.
      selectedItemId={searchText.length > 0 ? "composer" : undefined}
      searchBarPlaceholder="Type an item and press Enter"
      searchText={searchText}
    >
      <List.Section title="Composer">
        <List.Item
          id="composer"
          accessories={[{ tag: `Default List: ${defaultListStatus}` }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Item" />
              <Action
                icon={Icon.AddPerson}
                onAction={handlePickRandomItem}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                title="Pick Random Item"
              />
              <Action
                icon={useDefaultList ? Icon.CheckCircle : Icon.Circle}
                onAction={toggleDefaultList}
                title={useDefaultList ? "Disable Default List" : "Enable Default List"}
              />
            </ActionPanel>
          }
          icon={Icon.PlusCircle}
          title={addItemTitle}
        />
      </List.Section>
      <List.Section subtitle={`${allItems.length}`} title="Items in Play">
        {allItems.length === 0 ? (
          <List.Item
            id="empty-state"
            actions={
              <ActionPanel>
                <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Item" />
                <Action
                  icon={useDefaultList ? Icon.CheckCircle : Icon.Circle}
                  onAction={toggleDefaultList}
                  title={useDefaultList ? "Disable Default List" : "Enable Default List"}
                />
              </ActionPanel>
            }
            icon={Icon.MinusCircle}
            title="No items yet"
          />
        ) : (
          allItems.map((item, index) => {
            const isDefaultItem = useDefaultList && index < allItems.length;
            const itemIndex = useDefaultList ? allItems.length : 0;
            const customItemIndex = isDefaultItem ? -1 : index - itemIndex;

            return (
              <List.Item
                id={`${isDefaultItem ? "default" : "custom"}-${index}`}
                key={`${isDefaultItem ? "default" : "custom"}-${index}-${item}`}
                accessories={isDefaultItem ? [{ tag: "Default" }] : []}
                actions={
                  <ActionPanel>
                    <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Item" />
                    <Action
                      icon={Icon.AddPerson}
                      onAction={handlePickRandomItem}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      title="Pick Random Item"
                    />
                    {isDefaultItem ? null : (
                      <Action
                        icon={Icon.Trash}
                        // Only custom items can be removed from the list.
                        onAction={() => handleRemoveItem(customItemIndex)}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        title="Remove Item"
                      />
                    )}
                    <Action
                      icon={useDefaultList ? Icon.CheckCircle : Icon.Circle}
                      onAction={toggleDefaultList}
                      title={useDefaultList ? "Disable Default List" : "Enable Default List"}
                    />
                  </ActionPanel>
                }
                title={item}
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}
