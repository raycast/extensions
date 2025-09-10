import {
  LaunchProps,
  ActionPanel,
  Action,
  Icon,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  open,
  Clipboard,
  showHUD,
  List,
  Color,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import Dictionary, { GroupedEntry, Sense } from "./classes/dictionary";
import Favorite from "./classes/favorite";

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  let d: Dictionary;

  const colors: Color[] = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

  const language: string = props.arguments.language;
  const word: string = props.arguments.word;

  const [groupedEntries, setGroupedEntries] = useState<GroupedEntry>({});
  const [searchText, setSearchText] = useState("");
  const [entryURL, setEntryURL] = useState<string>("");
  const [languageFull, setLanguageFull] = useState<string>(language);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); // key: `${partOfSpeech}-${j}`

  useEffect(() => {
    d = new Dictionary(language, word);
    d.fetchEntry()
      .then((ge: GroupedEntry) => {
        setGroupedEntries(ge);
        setEntryURL(d.getURL);
        setLanguageFull(d.getLanguage);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setGroupedEntries({});
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch entry",
          message: "Please try again later",
        });
      });
  }, [language, word]);

  useEffect(() => {
    const checkFavorites = async () => {
      const favs: Record<string, boolean> = {};
      const promises: Promise<void>[] = [];

      for (const [partOfSpeech, entry] of Object.entries(groupedEntries)) {
        entry.senses.forEach((_, j: number) => {
          const promise = Favorite.exist(languageFull.toLowerCase(), word, j, partOfSpeech).then((exists) => {
            favs[`${partOfSpeech}-${j}`] = exists;
          });
          promises.push(promise);
        });
      }

      await Promise.all(promises);
      setFavorites({ ...favs });
    };

    if (Object.keys(groupedEntries).length) checkFavorites();
  }, [groupedEntries, languageFull, word]);

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by definition..."
      filtering={true}
      isShowingDetail={true}
    >
      {!Object.keys(groupedEntries).length ? (
        <List.EmptyView title="No definitions found" />
      ) : (
        Object.entries(groupedEntries).map(([partOfSpeech, entry], i: number) => {
          const color: Color = colors[i % colors.length];

          return (
            <List.Section
              key={partOfSpeech}
              title={`${partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1)} (${entry.senses.length})`}
            >
              {entry.senses.map((sense: Sense, j: number) => {
                const favKey = `${partOfSpeech}-${j}`;
                const isFavorite = favorites[favKey] || false;

                return (
                  <List.Item
                    key={`${word}-${partOfSpeech}-${j}`}
                    title={""}
                    icon={{
                      source: Icon.Dot,
                      tintColor: color,
                    }}
                    subtitle={sense.definition}
                    detail={<List.Item.Detail markdown={sense.markdown || "No details available."} />}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Open in Browser"
                          icon={Icon.Globe}
                          onAction={(): void => {
                            if (entryURL) open(entryURL);
                          }}
                        />
                        <Action
                          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                          style={isFavorite ? Action.Style.Destructive : Action.Style.Regular}
                          shortcut={isFavorite ? Keyboard.Shortcut.Common.Remove : Keyboard.Shortcut.Common.Pin}
                          onAction={async (): Promise<void> => {
                            if (!isFavorite) {
                              const success: boolean = await Favorite.addEntry(
                                languageFull,
                                word,
                                sense.markdown || "",
                                entryURL || "",
                                j,
                                partOfSpeech,
                              );
                              if (success) {
                                await showToast({
                                  style: Toast.Style.Success,
                                  title: "Added to Favorites",
                                  message: `"${word}" (${languageFull}) has been added to your favorites`,
                                });
                                setFavorites((prev) => ({ ...prev, [favKey]: true }));
                              } else {
                                await showToast({
                                  style: Toast.Style.Failure,
                                  title: "Failed to add to Favorites",
                                  message: `"${word}" (${languageFull}) is already in your favorites`,
                                });
                              }
                            } else {
                              const options: Alert.Options = {
                                title: "Remove from Favorites",
                                message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${languageFull}) will be removed from your favorites`,
                                primaryAction: {
                                  title: "Delete",
                                  style: Alert.ActionStyle.Destructive,
                                  onAction: async (): Promise<void> => {
                                    await showToast({
                                      style: Toast.Style.Success,
                                      title: "Removed from Favorites",
                                      message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${languageFull}) has been removed from your favorites`,
                                    });
                                  },
                                },
                              };
                              if (await confirmAlert(options)) {
                                const success: boolean = await Favorite.removeEntry(
                                  languageFull,
                                  word,
                                  j,
                                  partOfSpeech,
                                );
                                if (success) {
                                  setFavorites((prev) => ({ ...prev, [favKey]: false }));
                                } else {
                                  await showToast({
                                    style: Toast.Style.Failure,
                                    title: "Failed to remove from Favorites",
                                    message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${languageFull}) is not in your favorites`,
                                  });
                                }
                              }
                            }
                          }}
                        />
                        <Action
                          title="Copy to Clipboard"
                          icon={Icon.Clipboard}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          onAction={(): void => {
                            Clipboard.copy(sense.definition);
                            showHUD(
                              `The definitions for "${word}" (${language.toUpperCase()}) have been copied to clipboard`,
                            );
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
