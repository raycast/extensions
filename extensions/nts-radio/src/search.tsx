import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";
import { API_PATH, API_URL, WEB_URL } from "./constants/constants";
import { Nts } from "./types";
import Details from "./components/Details";
import Show from "./components/Show";

const types = [
  {
    id: 1,
    name: "All",
    value: "types[]=show&types[]=episode&types[]=collection",
  },
  { id: 2, name: "Episode", value: "types[]=episode" },
  { id: 3, name: "Show", value: "types[]=show" },
];

export default function Command() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("episode");

  const { isLoading, data } = useFetch<Nts>(
    `${API_URL}/${API_PATH.SEARCH}?q=${query}&version=2&offset=0&limit=48&${type}`
  );

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select a category to search for"
          storeValue={true}
          onChange={(newValue) => setType(newValue)}
        >
          <Grid.Dropdown.Section title="Categories">
            {types.map((type) => (
              <Grid.Dropdown.Item key={type.id} title={type.name} value={type.value} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {data?.results?.map((result, i: number) => (
        <Grid.Item
          key={`${i} ${result.title}`}
          content={result.image?.small}
          title={result.title}
          subtitle={`${capitalize(result.article_type)} • ${result.local_date}`}
          actions={
            <ActionPanel title={result.title}>
              {result.article_type === "episode" && result.article?.path && (
                <Action.Push
                  title="View More"
                  icon={Icon.AppWindowSidebarRight}
                  target={<Details path={result.article.path} />}
                />
              )}
              {result.article_type === "show" && result.article?.path && (
                <Action.Push
                  title="View More"
                  icon={Icon.AppWindowSidebarRight}
                  target={<Show path={result.article.path} />}
                />
              )}
              {result.article?.path && (
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`${WEB_URL}/${result.article.path}`}
                  icon={getFavicon(WEB_URL) || Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
