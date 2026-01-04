/**
 * Single grid item for kaomoji display
 */
import { Grid } from "@raycast/api";
import { useMemo } from "react";
import type { ItemActionHandlers, ItemType, Kaomoji } from "../../types";
import { generateSvgDataUri } from "../../lib/svg";
import { SearchActions } from "./SearchActions";

interface SearchItemProps {
  item: Kaomoji;
  isFavorite: boolean;
  selectedType: ItemType | "all";
  sectionItems: Kaomoji[];
  handlers: ItemActionHandlers;
}

export function SearchItem({ item, isFavorite, selectedType, sectionItems, handlers }: SearchItemProps) {
  // Memoize expensive computations
  const imageSource = useMemo(() => generateSvgDataUri(item.text), [item.text]);
  const displayName = item.name.en;
  const tooltip = useMemo(
    () => (item.credit ? `${displayName}\n© ${item.credit}` : displayName),
    [displayName, item.credit],
  );
  const keywords = useMemo(
    () => [...item.keywords, item.name.ja, item.name.en, item.text],
    [item.keywords, item.name.ja, item.name.en, item.text],
  );

  return (
    <Grid.Item
      content={{ source: imageSource, tooltip }}
      keywords={keywords}
      actions={
        <SearchActions
          item={item}
          isFavorite={isFavorite}
          selectedType={selectedType}
          sectionItems={sectionItems}
          handlers={handlers}
        />
      }
    />
  );
}
