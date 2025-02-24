import { useMemo, useState } from "react";
import { search, sortKind } from "fast-fuzzy";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { ITEM_TYPE_TO_LABEL } from "~/constants/labels";
import { Item, ItemType } from "~/types/vault";

interface ItemWithScore extends Item {
  score: number;
}

function hasValue(value: string | null | undefined): value is string {
  return !!(value && value !== SENSITIVE_VALUE_PLACEHOLDER);
}

function searchItems(items: Item[], searchText: string): Item[] {
  const searchTextLower = searchText.toLowerCase().trim();
  if (!searchTextLower) return items;

  const filteredItems = items.reduce<ItemWithScore[]>((items, item) => {
    const searchableProps = new Set([item.name, ITEM_TYPE_TO_LABEL[item.type]]);
    switch (item.type) {
      case ItemType.LOGIN: {
        const { username, uris } = item.login ?? {};
        if (hasValue(username)) searchableProps.add(username);
        if (uris?.length) uris.forEach(({ uri }) => hasValue(uri) && searchableProps.add(uri));
        break;
      }
      case ItemType.CARD: {
        const { brand, number } = item.card ?? {};
        if (hasValue(brand)) searchableProps.add(brand);
        if (hasValue(number)) searchableProps.add(number);
        break;
      }
    }

    const [searchScore] = search(searchTextLower, Array.from(searchableProps), {
      returnMatchData: true,
      ignoreCase: true,
      threshold: 0.5,
      sortBy: sortKind.bestMatch,
    });

    if (searchScore) {
      items.push({ ...item, score: searchScore.score });
    }

    return items;
  }, []);

  return filteredItems.sort((a, b) => b.score - a.score);
}

export function useVaultSearch(items: Item[]) {
  const [searchText, setSearchText] = useState("");
  const filteredItems = useMemo(() => searchItems(items, searchText), [items, searchText]);
  return { setSearchText, filteredItems };
}
