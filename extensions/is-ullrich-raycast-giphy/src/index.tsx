import { Action, ActionPanel, Icon, Grid } from "@raycast/api";

import type { IGif, IProfileUser } from "@giphy/js-types";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

// Could be used via `@giphy/js-fetch-api`, but I'm not bringing in the entire depency just for this type alone.
// https://github.com/Giphy/giphy-js/blob/c413823339234acda693d90ba87cc7fc4c4e9a29/packages/fetch-api/src/result-types.ts#L26-L28
interface GifSearchResult {
  data: IGif[];
}

// It's easy to get a Giphy API key: https://developers.giphy.com/docs/api#quick-start-guide
// Get your own and don't steal mine, please.
const giphyAPIKey = "Cw3z0ImWiQZsmi6ZbPwzmfkmkhiMolqZ";

const GifItem = (item: IGif) => {
  const user = item.user as IProfileUser | undefined;

  return (
    <Grid.Item
      key={item.id}
      content={{ source: item.images.preview_gif.url }}
      title={item.title}
      actions={
        <ActionPanel title="Giphy GIF search">
          <Action.Paste content={item.images.original.url} />
          <Action.OpenInBrowser title="View on GIPHY" url={item.url} icon={"command-icon.png"} />
          {user && (
            <Action.OpenInBrowser
              icon={{ source: Icon.Crown }}
              title={`More by @${user.display_name}`}
              url={user.profile_url}
            />
          )}
          <Action.CopyToClipboard title="Copy URL" content={item.images.original.url} />
        </ActionPanel>
      }
    />
  );
};

const EmptyView = ({ search, isLoading }: { search: string; isLoading: boolean }) => (
  <Grid.EmptyView
    title="GIF search powered by GIPHY"
    description={
      search.length === 0
        ? "Start typing your search and results will follow."
        : isLoading
          ? `Searching for "${search}"...`
          : `No results for "${search}". Try something else.`
    }
    icon={"giphy-logo.png"}
  />
);

const Command = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([] as IGif[]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    // TODO: Use AbortController to cancel previous requests before starting a new one
    //       Also make sure to keep the loading state intact
    fetch(`https://api.giphy.com/v1/gifs/search?q=${search}&api_key=${giphyAPIKey}`)
      .then((response) => response.json() as Promise<GifSearchResult>)
      .then(({ data }) => {
        setItems(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search]);

  return (
    <Grid
      searchText={search}
      onSearchTextChange={setSearch}
      throttle={true}
      aspectRatio="1"
      columns={4}
      searchBarPlaceholder="Search Giphy..."
      isLoading={loading}
      navigationTitle="Giphy Search"
    >
      {items.length === 0 ? <EmptyView search={search} isLoading={loading} /> : items.map(GifItem)}
    </Grid>
  );
};

export default Command;
