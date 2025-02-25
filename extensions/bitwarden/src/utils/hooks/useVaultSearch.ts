import { useMemo, useState } from "react";
import { Searcher, sortKind } from "fast-fuzzy";
import { ITEM_TYPE_TO_LABEL } from "~/constants/labels";
import { Item } from "~/types/vault";

export function useVaultSearch(items: Item[]) {
  const [searchText, setSearchText] = useState("");

  const searcher = useMemo(
    () =>
      new Searcher(items, {
        keySelector: (item) =>
          [
            item.name,
            ITEM_TYPE_TO_LABEL[item.type],
            item.login?.username,
            item.login?.uris?.map(({ uri }) => uri),
            item.card?.brand,
            item.card?.number,
          ]
            .flat()
            .filter(Boolean) as string[],
      }),
    [items]
  );
  const filteredItems = useMemo(
    () =>
      searchText
        ? searcher.search(searchText, {
            ignoreCase: true,
            threshold: 0.5,
            sortBy: sortKind.bestMatch,
          })
        : items,
    [searcher, searchText]
  );
  return { setSearchText, filteredItems };
}
