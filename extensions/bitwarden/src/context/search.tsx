import { useMemo, useState } from "react";
import { useVaultContext } from "./vault";
import { getPreferenceValues } from "@raycast/api";

export const useVaultWithSearch = () => {
  const { items, folders, isLoading, isEmpty } = useVaultContext();
  const [searchText, setSearchText] = useState("");
  const { shouldSearchUsername, shouldSearchUrl } = getPreferenceValues();

  const searchedItems = useMemo(() => {
    const searchTxt = searchText.toLowerCase().trim();
    return searchTxt
      ? items.filter((item) => {
          const matchesName = item.name.toLowerCase().includes(searchTxt);
          const matchesUsername =
            shouldSearchUsername && item.login?.username ? item.login.username.includes(searchTxt) : false;
          const urls = shouldSearchUrl && item.login?.uris ? item.login.uris.map((uri) => uri.uri)?.join(" ") : null;
          const matchesUrl = shouldSearchUrl && urls?.length ? urls.includes(searchTxt) : false;

          return matchesName || matchesUsername || matchesUrl;
        })
      : items;
  }, [items, searchText, shouldSearchUsername, shouldSearchUrl]);

  return { items: searchedItems, folders, isLoading, isEmpty, setSearchText };
};
