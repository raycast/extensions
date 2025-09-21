import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useState, useRef } from "react";
import { usePromise } from "@raycast/utils";

interface Preferences {
  sid: string;
  projects: string;
}

interface SearchResponse {
  projectName: string;
  searchQuery: string;
  pages: Array<{
    id: string;
    title: string;
    image: string;
    lines: string[];
  }>;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const projects = preferences.projects.split(",").map((p) => p.trim());
  const urlList = projects.map((project) => `https://scrapbox.io/api/pages/${project}/search/query?q=${searchText}`);

  const abortable = useRef<AbortController>(undefined);
  const { isLoading, data } = usePromise(
    async (urlList: string[]) => {
      if (urlList.length === 0 || searchText.trim() === "") {
        return [];
      }
      const responses = await Promise.all(
        urlList.map((u) =>
          fetch(u, { signal: abortable.current?.signal, headers: { Cookie: `connect.sid=${preferences.sid}` } }),
        ),
      );
      const results = await Promise.all(responses.map((r) => r.json()));
      return results as SearchResponse[];
    },
    [urlList],
    {
      abortable,
    },
  );

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading}>
      {data?.map((searchResult) => (
        <List.Section key={searchResult.projectName} title={searchResult.projectName}>
          {searchResult.pages.map((page) => (
            <List.Item
              key={page.id}
              title={page.title}
              icon={page.image}
              subtitle={page.lines[0]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://scrapbox.io/${searchResult.projectName}/${page.title}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
