import { SearchParameters, SearchResponse, search } from "@notionhq/client/build/src/api-endpoints";
import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchPages } from "../util/notion";
import useDebounce from "../hooks/useDebounce";

type SelectPageProps = {};
const SelectPage: React.FC<SelectPageProps> = (props) => {
  const [pages, setPages] = useState<null | SearchResponse>(null);
  const [searchText, setSearchText] = useState("");
  const [filteredPages, setFilteredPages] = useState<SearchResponse | null>(null);
  const debouncedSearch = useDebounce(searchText);

  useEffect(() => {
    (async () => {
      const pages = await fetchPages(debouncedSearch);

      if (pages) setPages(pages);

      console.log(pages);
    })();
  }, [debouncedSearch]);

  useEffect(() => {
    // setFilteredPages(pages ? pages.results.filter((p) => p.object) : []);
  }, [searchText]);

  return (
    <List
      onSearchTextChange={setSearchText}
      navigationTitle="Dump page"
      searchBarPlaceholder="Search page you want to dump to"
    >
      {pages?.results
        .filter((r) => r.object === "page")
        .map((r) => (
          <List.Item
            key={r.id}
            title={(r as any).url ? (r as any).url.split("https://www.notion.so/")[1].split("-")[0] : r.id}
          />
        ))}
    </List>
  );
};

export default SelectPage;
