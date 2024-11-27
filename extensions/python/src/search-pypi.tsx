import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { PackageListItem } from "./components/PackageListItem";
import { scrapePackages } from "./pypi";

export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const abortable = useRef<AbortController>();

  const { isLoading, data, revalidate } = usePromise(
    async () => {
      const url = `https://pypi.org/search/?q=${searchTerm}`;
      const response = await fetch(url);
      const html = await response.text();
      return scrapePackages(html);
    },
    [],
    { abortable, execute: !!searchTerm },
  );

  const debounced = useDebouncedCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_searchTerm: string) => {
      revalidate();
    },
    600,
    { debounceOnServer: true },
  );

  useEffect(() => {
    if (searchTerm) {
      debounced(searchTerm);
    } else {
      revalidate();
    }
  }, [searchTerm]);

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "fastapi"…`}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data?.length ? (
            <>
              <List.Item
                title={`View search results for "${searchTerm}" on pypi.org`}
                icon={Icon.MagnifyingGlass}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://pypi.org/search?q=${searchTerm}`}
                      title="View PyPI Search Results"
                    />
                  </ActionPanel>
                }
              />
              <List.Section title="Results" subtitle={data.length.toString()}>
                {data.map((result) => {
                  return <PackageListItem key={result.name} pkg={result} />;
                })}
              </List.Section>
            </>
          ) : null}
        </>
      ) : null}
    </List>
  );
}
