import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { API_PATH, API_URL, WEB_URL } from "./constants/constants";
import { Nts } from "./types";
import Details from "./components/Details";

export default function Command() {
  const { isLoading, data } = useFetch<Nts>(`${API_URL}/${API_PATH.SEARCH}/episodes?&offset=0&limit=12`);

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <Grid isLoading={isLoading} columns={4} filtering={false}>
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
                  title="Open"
                  icon={Icon.AppWindowSidebarRight}
                  target={<Details path={result.article.path} />}
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
