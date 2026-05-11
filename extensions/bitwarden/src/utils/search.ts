import { Icon } from "@raycast/api";
import { Searcher } from "fast-fuzzy";
import { useMemo, useState } from "react";
import { URL } from "url";
import { ITEM_TYPE_TO_LABEL } from "~/constants/labels";
import { Item } from "~/types/vault";

export function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://icons.bitwarden.net/${domain}/icon.png`;
  } catch (err) {
    return Icon.Globe;
  }
}

export function useVaultSearch(items: Item[]) {
  const [searchText, setSearchText] = useState("");

  const searcher = useMemo(() => {
    return new Searcher(items, {
      ignoreSymbols: false,
      threshold: 0.7,
      keySelector: (item) => {
        const { login, card } = item;
        return [
          item.name,
          ITEM_TYPE_TO_LABEL[item.type],
          login?.username,
          login?.uris?.map(({ uri }) => uri),
          card?.brand,
          card?.number,
        ]
          .flat()
          .filter((value): value is string => !!value);
      },
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchText) return items;
    return searcher.search(searchText);
  }, [searcher, searchText]);

  return { setSearchText, filteredItems };
}
