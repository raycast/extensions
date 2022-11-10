import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { useAtomValue } from "jotai";
import { search } from "./utils/notion";
import { Page } from "./utils/types";
import { recentlyOpenedPagesAtom } from "./utils/state";
import { PageListItem } from "./components";

export default function SearchList(): JSX.Element {
  const { value: recentlyOpenedPages } = useAtomValue(recentlyOpenedPagesAtom);
  const [pages, setPages] = useState<Page[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Search pages
  useEffect(() => {
    const searchNotionPages = async () => {
      setIsLoading(true);

      const searchedPages = await search(searchText);
      if (searchedPages.length) {
        setPages(searchedPages);
      }
      setIsLoading(false);
    };
    searchNotionPages();
  }, [searchText]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pages" onSearchTextChange={setSearchText} throttle={true}>
      <List.Section title="Recent">
        {recentlyOpenedPages
          .filter((p) => (p.title ? p.title : "Untitled").toLowerCase().includes(searchText.toLowerCase()))
          .map((p) => (
            <PageListItem
              key={`recently-open-page-${p.id}`}
              page={p}
              databaseView={undefined}
              databaseProperties={undefined}
              onPageCreated={(page) => setPages((state) => state.concat([page]))}
              onPageUpdated={(page) => setPages((state) => state.map((x) => (x.id === page.id ? page : x)))}
            />
          ))}
      </List.Section>
      <List.Section title="Search">
        {pages?.map((p) => (
          <PageListItem
            key={`search-result-page-${p.id}`}
            page={p}
            databaseView={undefined}
            databaseProperties={undefined}
            onPageCreated={(page) => setPages((state) => state.concat([page]))}
            onPageUpdated={(page) => setPages((state) => state.map((x) => (x.id === page.id ? page : x)))}
          />
        ))}
      </List.Section>
    </List>
  );
}
