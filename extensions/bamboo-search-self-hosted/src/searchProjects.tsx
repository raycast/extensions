import { projects } from "./bamboo/search";
import { preferences } from "./helpers/preferences";
import { ResultItem, SearchCommand } from "./components/SearchCommand";

export const searchHandler = async (query: string): Promise<ResultItem[]> => {
  const result = await projects({ searchTerm: query });

  return result.searchResults.map<ResultItem>((item) => ({
    id: item.searchEntity.id,
    title: item.searchEntity.projectName,
    subtitle: item.searchEntity.description,
    url: `https://${preferences.host}/browse/${item.searchEntity.id}`,
  }));
};

export default () => {
  return SearchCommand(searchHandler, "Search projects by title");
};
