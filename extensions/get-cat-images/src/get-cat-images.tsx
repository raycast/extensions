import { useState, useEffect } from "react";

import { List, ActionPanel, Action, Icon, LocalStorage, showToast } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";

import breeds from "./lib/breeds";

export interface CatImage {
  url: string;
  breeds?: Array<{ id: string; name: string }>;
  id: string;
}

export default function Command() {
  const [currentBreed, setCurrentBreed] = useState<string | null>(null);

  const apiUrl =
    currentBreed && currentBreed !== "random"
      ? `https://api.thecatapi.com/v1/images/search?breed_ids=${currentBreed}`
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

  async function addToFavorites() {
    if (data && data.length > 0) {
      const favoritesString = await LocalStorage.getItem<string>("favorites");
      const favorites = favoritesString ? JSON.parse(favoritesString) : [];
      if (!favorites.includes(data[0].id)) {
        favorites.push(data[0].id);
        await LocalStorage.setItem("favorites", JSON.stringify(favorites));
        showToast({ title: "Added to Favorites", message: "Cat image has been added to your favorites." });
      } else {
        showFailureToast("Cat image is already in favorites.");
      }
    }
  }

  function Actions() {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Image URL" content={data && data[0]?.url ? data[0].url : ""} />
        <Action title="Re-Roll" icon={Icon.Repeat} onAction={revalidate} />
        <Action.OpenInBrowser
          title="Open in Browser"
          icon={Icon.Window}
          url={data && data[0]?.id ? `https://cdn2.thecatapi.com/images/${data[0].id}.jpg` : ""}
        />
        <Action
          title="Add to Favorites"
          shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, windows: { modifiers: ["ctrl"], key: "f" } }}
          icon={Icon.Star}
          onAction={addToFavorites}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Search Cats..."
      isLoading={isLoading}
      onSelectionChange={(id: string | null) => setContent(id)}
    >
      <List.Item id="random" title="Random" detail={<List.Item.Detail markdown={content} />} actions={Actions()} />
      {breeds.map(({ id, name }) => (
        <List.Item key={id} id={id} title={name} detail={<List.Item.Detail markdown={content} />} actions={Actions()} />
      ))}
    </List>
  );
}
