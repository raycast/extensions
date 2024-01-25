import { Action, ActionPanel, Icon, Grid } from "@raycast/api";

import { useState, useEffect } from "react";
import fetch from "node-fetch";

// It's easy to get a Giphy API key: https://developers.giphy.com/docs/api#quick-start-guide
// Get your own and don't steal mine, please.
const giphyAPIKey = "Cw3z0ImWiQZsmi6ZbPwzmfkmkhiMolqZ";

const GifItem = (item) => (
  <Grid.Item
    key={item.id}
    content={{ source: item.images.preview_gif.url }}
    title={item.title}
    actions={
      <ActionPanel title="Giphy GIF search">
        <Action.Paste content={item.images.original.url} />
        <Action.OpenInBrowser title="View on GIPHY" url={item.url} icon={"command-icon.png"} />
        {item.user && (
          <Action.OpenInBrowser
            icon={{ source: Icon.Crown }}
            title={`More by @${item.user.display_name}`}
            url={item.user.profile_url}
          />
        )}
        <Action.CopyToClipboard title="Copy URL" content={item.images.original.url} />
      </ActionPanel>
    }
  />
);

const EmptyView = () => (
  <Grid.EmptyView
    title="GIF search powered by GIPHY"
    message="Search for something that has results"
    icon={"giphy-logo.png"}
  />
);

const Command = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
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
      .then((response) => response.json())
      .then((data) => {
        setItems(data.data);
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
      {items.length === 0 ? <EmptyView /> : items.map(GifItem)}
    </Grid>
  );
};

export default Command;
