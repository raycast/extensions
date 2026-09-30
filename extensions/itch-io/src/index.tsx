import { List } from "@raycast/api";
import { useState } from "react";
import { getGames } from "./api/getgames";
import { CategoryDropdown } from "./components/categoryDropdown";
import { SearchListItem } from "./components/searchListItem";
import { categories } from "./interface/gameCategories";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const [category, setCategory] = useState("");
  const { isLoading, data: games } = useCachedPromise(
    async (tag: string) => {
      return await getGames(tag);
    },
    [category],
    {
      initialData: [],
    },
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={<CategoryDropdown categories={categories} onCategoryTypeChange={setCategory} />}
    >
      {games.map((game) => (
        <SearchListItem key={game.title} searchResult={game} />
      ))}
    </List>
  );
}
