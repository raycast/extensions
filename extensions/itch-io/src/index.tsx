import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGames } from "./api/getgames";
import { CategoryDropdown } from "./components/categoryDropdown";
import { SearchListItem } from "./components/searchListItem";
import { categories } from "./interface/gameCategories";
import { ItchModel } from "./interface/itchModel";

export default function Command() {
  const [games, setGames] = useState<ItchModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getGames("").then((games) => {
      setGames(games);
      setIsLoading(false);
    });
  }, []);

  const onCategoryTypeChange = (categoryValue: string) => {
    setIsLoading(true);
    getGames(categoryValue).then((torrents) => {
      setGames(torrents);
      setIsLoading(false);
    });
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={<CategoryDropdown categories={categories} onCategoryTypeChange={onCategoryTypeChange} />}
    >
      {games.map((game) => (
        <SearchListItem key={game.title} searchResult={game} />
      ))}
    </List>
  );
}
