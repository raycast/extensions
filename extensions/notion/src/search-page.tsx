import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { Page, searchPages } from "./utils/notion";
import { loadRecentlyOpenedPages } from "./utils/local-storage";
import { PageListItem } from "./components";

export default function SearchPageList(): JSX.Element {
  // Setup useState objects
  const [pages, setPages] = useState<Page[]>();
  const [recentlyOpenPages, setRecentlyOpenPages] = useState<Page[]>();
  const [searchText, setSearchText] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch and filter recently open pages
  useEffect(() => {
    const loadRecentlyOpenPage = async () => {
      const cachedRecentlyOpenPages = await loadRecentlyOpenedPages();

      if (searchText) {
        setRecentlyOpenPages(
          cachedRecentlyOpenPages.filter(function (p: Page) {
            return (p.title ? p.title : "Untitled").toLowerCase().includes(searchText.toLowerCase());
          })
        );
      } else {
        setRecentlyOpenPages(cachedRecentlyOpenPages);
      }
    };
    loadRecentlyOpenPage();
  }, [searchText]);

  // Search pages
  useEffect(() => {
    const searchNotionPages = async () => {
      setIsLoading(true);

      if (searchText) {
        const searchedPages = await searchPages(searchText);
        if (searchedPages && searchedPages[0]) {
          setPages(searchedPages);
        }
      } else {
        setPages([]);
      }
      setIsLoading(false);
    };
    searchNotionPages();
  }, [searchText]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pages" onSearchTextChange={setSearchText} throttle={true}>
      <List.Section key="recently-open-pages" title="Recent">
        {recentlyOpenPages?.map((p) => (
          <PageListItem
            key={`recently-open-page-${p.id}`}
            page={p}
            databaseView={undefined}
            databaseProperties={undefined}
          />
        ))}
      </List.Section>
      <List.Section key="search-result" title="Search">
        {pages?.map((p) => (
          <PageListItem
            key={`search-result-page-${p.id}`}
            page={p}
            databaseView={undefined}
            databaseProperties={undefined}
          />
        ))}
      </List.Section>
    </List>
  );
}
