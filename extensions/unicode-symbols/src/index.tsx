import { ActionPanel, List, Action } from "@raycast/api";
import { useRef, useState } from "react";
import { Character, Dataset, getFilteredDataset } from "./dataset-manager";
import { useRecentlyUsedItems } from "./use-recently-used-items";

/**
 * Maps an unicode characters dataset + the list of recently used characters to a section list
 * to populate the Raycast list.
 * @param dataset A (filtered) unicode characters dataset
 * @param recentlyUsedCharacters List of recently used unicode characters
 * @param isFilterEmpty Is the search filter empty?
 * @returns List of unicode characters to populate the Raycast list
 */
function buildList(dataset: Dataset, recentlyUsedCharacters: Character[], isFilterEmpty: boolean) {
  const datasetListSections = dataset.blocks.map((block) => ({
    sectionTitle: block.blockName,
    items: dataset.characters.filter(
      (character) => block.startCode <= character.code && block.endCode >= character.code
    ),
  }));
  if (recentlyUsedCharacters.length) {
    datasetListSections.unshift({
      sectionTitle: "Recently Used",
      items: isFilterEmpty
        ? recentlyUsedCharacters
        : recentlyUsedCharacters.filter((recentlyUsedCharacter) =>
            dataset.characters.find((character) => character.code === recentlyUsedCharacter.code)
          ),
    });
  }
  return datasetListSections;
}

/**
 * Utility to uppercase only the first character of a given string
 * @param str Input string
 * @returns The input string with only the first character uppercased
 */
function upperCaseFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function Command() {
  const [dataset, setDataset] = useState(getFilteredDataset());
  const searchTextRef = useRef("");

  function handleSearchTextChange(text: string) {
    searchTextRef.current = text;
    setDataset(getFilteredDataset(text));
  }

  const { recentlyUsedItems, addToRecentlyUsedItems, areRecentlyUsedItemsLoaded } = useRecentlyUsedItems<Character>({
    key: "recently-used",
    comparator: "code",
  });

  const list = !areRecentlyUsedItemsLoaded ? [] : buildList(dataset, recentlyUsedItems, !searchTextRef.current);

  return (
    <List isLoading={!addToRecentlyUsedItems || !list.length} onSearchTextChange={handleSearchTextChange}>
      {list.map((section) => (
        <List.Section key={section.sectionTitle} title={section.sectionTitle}>
          {section.items.map((item) => {
            const accessories = [];
            if (item.aliases?.length) {
              accessories.push({ icon: "⌨️", text: `${item.aliases.join(", ")}` });
            }

            return (
              <List.Item
                key={item.name}
                title={item.value}
                subtitle={upperCaseFirst(item.name)}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Paste
                        title="Paste Character in Active App"
                        content={item.value}
                        onPaste={() => addToRecentlyUsedItems(item)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Character to Clipboard"
                        content={item.value}
                        onCopy={() => addToRecentlyUsedItems(item)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
