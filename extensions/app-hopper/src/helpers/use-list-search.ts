import { useState } from "react";

/** Native navigation retains each level's query and selected item when returning. */
export function useListSearch(initialSearchText = "") {
  const [searchText, setSearchText] = useState(initialSearchText);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  return {
    searchText,
    selectedItemId,
    onSearchTextChange: (value: string) => {
      setSearchText(value);
      setSelectedItemId(undefined);
    },
    onSelectionChange: (id: string | null) => setSelectedItemId(id ?? undefined),
  };
}
