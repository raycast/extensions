import { List, ActionPanel, Action, Icon, Alert, showToast, confirmAlert, Toast, open, Keyboard } from "@raycast/api";
import { JSX, useEffect, useState } from "react";
import Favorite, { FavoriteEntry } from "./classes/favorite";
import Dictionary from "./classes/dictionary";

export default function Command(): JSX.Element {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

  useEffect(() => {
    const fetchFavorites = async () => {
      const favs: FavoriteEntry[] = await Favorite.getEntries();
      setFavorites(favs);
      setLoading(false);
    };

    fetchFavorites();
  }, []);

  const langs: string[] = Array.from(new Set(favorites.map((fav) => fav.language)));

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter favorites by word..."
      filtering={true}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by language" storeValue={true} onChange={setSelectedLanguage} defaultValue="All">
          <List.Dropdown.Item title="All" value="All" />
          {langs.map((lang: string) => (
            <List.Dropdown.Item
              key={lang}
              title={Dictionary.capitalize(lang)}
              value={lang}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!favorites.length ? (
        <List.EmptyView title="No favorites found" />
      ) : (
        Object.entries(
          favorites.reduce(
            (
              acc: {
                [lang: string]: { word: string; markdown: string; url: string; partOfSpeech: string; entry: number }[];
              },
              fav: FavoriteEntry,
            ) => {
              if (!acc[fav.language]) acc[fav.language] = [];
              acc[fav.language].push({
                word: fav.word,
                markdown: fav.markdown,
                url: fav.url,
                partOfSpeech: fav.partOfSpeech,
                entry: fav.entry,
              });
              return acc;
            },
            {},
          ),
        )
          .filter(([lang]) => selectedLanguage === "All" || lang === selectedLanguage)
          .sort(([langA], [langB]) => langA.localeCompare(langB))
          .map(
            ([lang, wordDefinition]: [
              string,
              { word: string; markdown: string; url: string; partOfSpeech: string; entry: number }[],
            ]) => (
              <List.Section key={lang} title={Dictionary.capitalize(lang)}>
                {wordDefinition
                  .filter((entry) => entry.word.toLowerCase().includes(searchText.toLowerCase()))
                  .map((entry) => (
                    <List.Item
                      key={`${entry.word}-${entry.partOfSpeech}-${entry.entry}`}
                      title={entry.word}
                      detail={<List.Item.Detail markdown={entry.markdown || "No details available."} />}
                      actions={
                        <ActionPanel>
                          <Action
                            title="Open in Browser"
                            icon={Icon.Globe}
                            shortcut={Keyboard.Shortcut.Common.Open}
                            onAction={(): void => {
                              const url: string = entry.url;
                              if (url) open(url);
                            }}
                          />
                          <ActionPanel.Section>
                            <Action
                              title="Remove from Favorites"
                              icon={Icon.StarDisabled}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.Remove}
                              onAction={async (): Promise<void> => {
                                const options: Alert.Options = {
                                  title: "Remove from Favorites",
                                  message: `"${entry.word}" (${Dictionary.capitalize(lang)}) will be removed from your favorites`,
                                  primaryAction: {
                                    title: "Delete",
                                    style: Alert.ActionStyle.Destructive,
                                    onAction: async (): Promise<void> => {
                                      const success: boolean = await Favorite.removeEntry(
                                        lang,
                                        entry.word,
                                        entry.entry,
                                        entry.partOfSpeech,
                                      );

                                      if (success) {
                                        const favs: FavoriteEntry[] = await Favorite.getEntries();
                                        setFavorites(favs);

                                        await showToast({
                                          style: Toast.Style.Success,
                                          title: "Removed from Favorites",
                                          message: `"${entry.word}" (${Dictionary.capitalize(lang)}) has been removed from your favorites`,
                                        });
                                      } else {
                                        await showToast({
                                          style: Toast.Style.Failure,
                                          title: "Failed to remove from Favorites",
                                          message: `"${entry.word}" (${Dictionary.capitalize(lang)}) could not be found in your favorites`,
                                        });
                                      }
                                    },
                                  },
                                };

                                await confirmAlert(options);
                              }}
                            />
                            <Action
                              title="Remove All Favorites"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.RemoveAll}
                              onAction={async (): Promise<void> => {
                                const options: Alert.Options = {
                                  title: "Remove All Favorites",
                                  message: `All favorites will be removed`,
                                  primaryAction: {
                                    title: "Delete",
                                    style: Alert.ActionStyle.Destructive,
                                    onAction: async (): Promise<void> => {
                                      const success: boolean = await Favorite.removeAll();

                                      if (success) {
                                        const favs: FavoriteEntry[] = await Favorite.getEntries();
                                        setFavorites(favs);

                                        await showToast({
                                          style: Toast.Style.Success,
                                          title: "Removed from Favorites",
                                          message: `All favorites have been removed`,
                                        });
                                      } else {
                                        await showToast({
                                          style: Toast.Style.Failure,
                                          title: "Failed to remove from Favorites",
                                          message: `Could not remove all favorites`,
                                        });
                                      }
                                    },
                                  },
                                };

                                await confirmAlert(options);
                              }}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  ))}
              </List.Section>
            ),
          )
      )}
    </List>
  );
}
