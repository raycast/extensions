import { plans } from "./bamboo/search";
import { preferences } from "./helpers/preferences";
import { ResultItem, SearchCommand } from "./components/SearchCommand";

export const searchHandler = async (query: string): Promise<ResultItem[]> => {
  const result = await plans({ searchTerm: query });

  return result.searchResults.map<ResultItem>((item) => ({
    id: item.searchEntity.id,
    title: item.searchEntity.planName,
    subtitle: item.searchEntity.description,
    accessories: [{ text: item.searchEntity.branchName }],
    url: `https://${preferences.host}/browse/${item.searchEntity.id}`,
  }));
};

export default () => {
  return SearchCommand(searchHandler, "Search plans by title");
};
