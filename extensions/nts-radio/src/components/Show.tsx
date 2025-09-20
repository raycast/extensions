import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { API_URL, WEB_URL } from "../constants/constants";
import { Show } from "../types";
import Details from "./Details";
import { getDate } from "../utils/getDate";

type Props = {
  path: string;
};

export default function Show({ path }: Props) {
  console.log("show path:", `${API_URL}${path}`);
  const { isLoading, data } = useFetch<Show>(`${API_URL}${path}`);

  const results = data?.embeds?.episodes?.results;

  return (
    <Grid isLoading={isLoading} columns={4} filtering={false}>
      {results?.map((result, i: number) => (
        <Grid.Item
          key={`${i} ${result.name}`}
          content={result.media?.picture_large}
          title={result.name}
          subtitle={`Episode • ${getDate(result.broadcast)}`}
          actions={
            <ActionPanel title={result.name}>
              {result.show_alias && result.episode_alias && (
                <Action.Push
                  title="Open"
                  icon={Icon.AppWindowSidebarRight}
                  target={<Details path={`/shows/${result.show_alias}/episodes/${result.episode_alias}`} />}
                />
              )}
              {result.show_alias && result.episode_alias && (
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`${WEB_URL}/shows/${result.show_alias}/episodes/${result.episode_alias}`}
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
