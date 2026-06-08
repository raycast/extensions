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
    if (customItems.length === 0) {
      await showToast({
        message: "Add at least one item before picking.",
        style: Toast.Style.Failure,
        title: "No items found",
      });
      return;
    }

    setValue(pickRandomItem({ items: customItems }) ?? null);
  }

  function handleRemoveItem(index: number) {
    setCustomItems((previousItems) => removeItemAtIndex(previousItems, index));
  }

  if (value !== null) {
    return <PickRandomItemResult onReset={() => setValue(null)} value={value} />;
  }

  const addItemTitle = searchText.length > 0 ? `Add "${searchText}"` : "Type an item to add";

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
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Item" />
              <Action
                icon={Icon.AddPerson}
                onAction={handlePickRandomItem}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                title="Pick Random Item"
              />
            </ActionPanel>
          }
          icon={Icon.PlusCircle}
          title={addItemTitle}
        />
      </List.Section>
      <List.Section subtitle={`${customItems.length}`} title="Items in Play">
        {customItems.length === 0 ? (
          <List.Item
            id="empty-state"
            actions={
              <ActionPanel>
                <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Item" />
              </ActionPanel>
            }
            icon={Icon.MinusCircle}
            title="No items yet"
          />
        ) : (
          customItems.map((item, index) => {
            return (
              <List.Item
                id={`custom-${index}`}
                key={`custom-${index}-${item}`}
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
                      icon={Icon.Trash}
                      onAction={() => handleRemoveItem(index)}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      title="Remove Item"
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
