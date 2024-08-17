import React, { useState, useMemo, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Icon,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { shortcuts, categories } from "./utils/shortcuts";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Show All");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const storedFavorites = await LocalStorage.getItem<string>("favorites");
      if (storedFavorites) {
        try {
          setFavorites(JSON.parse(storedFavorites));
        } catch (error) {
          console.error("Error parsing favorites from local storage:", error);
        }
      }
    })();
  }, []);

  const toggleFavorite = async (url: string) => {
    setFavorites((prevFavorites) => {
      const newFavorites = prevFavorites.includes(url)
        ? prevFavorites.filter((fav) => fav !== url)
        : [...prevFavorites, url];
      LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter(
      (shortcut) =>
        (selectedCategory === "Show All" ||
          shortcut.categories.includes(selectedCategory) ||
          (selectedCategory === "Favorites" &&
            favorites.includes(shortcut.url))) &&
        (shortcut.title.toLowerCase().includes(searchText.toLowerCase()) ||
          shortcut.company.toLowerCase().includes(searchText.toLowerCase()) ||
          shortcut.subtitle.toLowerCase().includes(searchText.toLowerCase())),
    );
  }, [searchText, selectedCategory, favorites]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search shortcuts..."
      throttle
      navigationTitle=".New Shortcuts"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          storeValue={true}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          <List.Dropdown.Section title="Categories">
            <List.Dropdown.Item title="Show All" value="Show All" />
            {categories.map((category) => (
              <List.Dropdown.Item
                key={category}
                title={category}
                value={category}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Favorites">
            <List.Dropdown.Item title="Favorites" value="Favorites" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredShortcuts.map((shortcut) => (
        <List.Item
          key={shortcut.url}
          title={shortcut.title}
          subtitle={shortcut.company}
          accessories={[{ text: shortcut.subtitle }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`Open ${shortcut.company} Shortcut`}
                url={shortcut.url}
                onOpen={() =>
                  showToast({
                    style: Toast.Style.Success,
                    title: "Opening in browser",
                    message: `Opening ${shortcut.company} shortcut`,
                  })
                }
              />
              <Action
                title={
                  favorites.includes(shortcut.url)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                onAction={() => toggleFavorite(shortcut.url)}
                icon={
                  favorites.includes(shortcut.url)
                    ? Icon.StarDisabled
                    : Icon.Star
                }
              />
              <Action.CopyToClipboard
                title="Copy Link"
                content={shortcut.url}
                onCopy={() =>
                  showToast({
                    style: Toast.Style.Success,
                    title: "Link Copied",
                    message: `${shortcut.url} copied to clipboard`,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
