import { useState, useEffect, useMemo, useCallback } from "react";

import { List, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";

import breeds from "./lib/breeds";
import { useFavorites } from "./lib/useFavorites";

export interface CatImage {
  url: string;
  breeds?: Array<{ id: string; name: string }>;
  id: string;
}

export default function Command() {
  const [currentBreed, setCurrentBreed] = useState<string | null>(null);
  const [, , saveFavorite, , isFavoritesLoading] = useFavorites();

  const apiUrl =
    currentBreed && currentBreed !== "random"
      ? `https://api.thecatapi.com/v1/images/search?breed_ids=${encodeURIComponent(currentBreed)}`
      : "https://api.thecatapi.com/v1/images/search";
  const { isLoading, data, revalidate, error } = useFetch<CatImage[]>(apiUrl);

  const content = error
    ? `# Error\n${error.message}`
    : !isLoading && data && data.length > 0
      ? `![](${data[0].url}?raycast-height=325)`
      : "# Loading...";

  const setContent = (id: string | null) => {
    if (id === "random") {
      setCurrentBreed(null);
      revalidate();
    } else {
      setCurrentBreed(id);
      revalidate();
    }
  };

  useEffect(() => {
    if (error) {
      showFailureToast(error.message, { title: "Failed to fetch cat images" });
    }
  }, [error]);

  const addToFavorites = useCallback(async () => {
    if (data && data[0]) {
      const url = data[0].url;
      if (url && url.toLowerCase().endsWith(".gif")) {
        showFailureToast("GIFs can't be favorited", { title: "GIF Detected" });
        return;
      }
      await saveFavorite(data[0].id);
    }
  }, [data, saveFavorite]);

  const actions = useMemo(
    () => (
      <ActionPanel>
        <Action title="Re-Roll" icon={Icon.Repeat} onAction={revalidate} />
        <Action.CopyToClipboard title="Copy Image URL" content={data && data[0]?.url ? data[0].url : ""} />
        <Action.OpenInBrowser
          title="Open in Browser"
          icon={Icon.Window}
          url={data && data[0]?.id ? `https://cdn2.thecatapi.com/images/${encodeURIComponent(data[0].id)}.jpg` : ""}
        />
        <Action
          title="Add to Favorites"
          shortcut={Keyboard.Shortcut.Common.Pin}
          icon={Icon.Star}
          onAction={addToFavorites}
        />
      </ActionPanel>
    ),
    [data, revalidate, isFavoritesLoading, addToFavorites],
  );

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Search Cats..."
      isLoading={isLoading}
      onSelectionChange={(id: string | null) => setContent(id)}
    >
      <List.Item id="random" title="Random" detail={<List.Item.Detail markdown={content} />} actions={actions} />
      {breeds.map(({ id, name }) => (
        <List.Item key={id} id={id} title={name} detail={<List.Item.Detail markdown={content} />} actions={actions} />
      ))}
    </List>
  );
}
