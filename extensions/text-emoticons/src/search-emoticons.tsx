import { useState } from "react";
import { List } from "@raycast/api";

import { SearchBar } from "./components/search-bar";
import { EmoticonItem } from "./components/emoticon-item";
import { RecentEmoticons } from "./components/recent-emoticons";

import { getEmoticonItemKey } from "./utils/emoticon-item-key";

import { usePagination } from "./hooks/use-pagination";

import emoticonCategories from "./data/emoticons.json";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [categorySlug, setCategorySlug] = useState<string>("all");

  const { isLoading, pagination, paginatedEmoticons } = usePagination(
    emoticonCategories,
    searchText,
    categorySlug,
  );

  const initialCategorySelected = categorySlug === "all";
  const shouldShowRecent = !searchText && initialCategorySelected;

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <SearchBar onChange={setCategorySlug} categories={emoticonCategories} />
      }
    >
      {shouldShowRecent && <RecentEmoticons />}

      {initialCategorySelected && (
        <List.Section title={searchText ? "Search Results" : "All Emoticons"}>
          {(paginatedEmoticons || []).map((emoticon) => (
            <EmoticonItem
              key={getEmoticonItemKey(emoticon)}
              emoticon={emoticon}
            />
          ))}
        </List.Section>
      )}

      {!initialCategorySelected &&
        (paginatedEmoticons || []).map((emoticon) => (
          <EmoticonItem
            key={getEmoticonItemKey(emoticon)}
            emoticon={emoticon}
          />
        ))}
    </List>
  );
}
