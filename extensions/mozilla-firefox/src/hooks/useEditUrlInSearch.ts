import { useEffect, useRef, useState } from "react";

export const NEW_TAB_ITEM_ID = "new-tab";

export function useEditUrlInSearch() {
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  function editUrlInSearch(url: string) {
    setSearchText(url);
    setSelectedItemId(NEW_TAB_ITEM_ID);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setSelectedItemId(undefined), 0);
  }

  return { searchText, setSearchText, selectedItemId, editUrlInSearch };
}
