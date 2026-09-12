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
  getPreferenceValues,
  Detail,
  openCommandPreferences,
  clearSearchBar,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import Dictionary, { GroupedEntry, Sense } from "./classes/dictionary";
import Favorite from "./classes/favorite";
import History from "./classes/history";

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  let d: Dictionary;

  const colors: Color[] = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

  const language: string = props.arguments.language || getPreferenceValues<Preferences.Search>().default_language;
  const word: string = props.arguments.word || props.fallbackText || "";

  const [groupedEntries, setGroupedEntries] = useState<GroupedEntry>({});
  const [searchText, setSearchText] = useState("");
  const [entryURL, setEntryURL] = useState<string>("");
  const [languageFull, setLanguageFull] = useState<string>(language);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); // key: `${partOfSpeech}-${j}`

  useEffect((): void => {
    d = new Dictionary(language, word);
    d.getEntry()
      .then(async (ge: GroupedEntry | undefined) => {
        if (ge) {
          setGroupedEntries(ge);
          setEntryURL(d.getURL);
          setLanguageFull(d.getLanguage);
          setLoading(false);

          if (Object.entries(ge).length && d.getLanguage) {
            const success: boolean = await History.addEntry(d.getLanguage, language, word);

            if (!success) {
              showToast({
                style: Toast.Style.Failure,
                title: "There was an error saving the entry to your history",
                message: "Please try again later",
              });
            }
          }
        } else {
          setLoading(false);
          setGroupedEntries({});
          showToast({
            style: Toast.Style.Failure,
            title: "There was an error searching the word",
            message: "Please try again later",
          });
        }
      })
      .catch((): void => {
        setLoading(false);
        setGroupedEntries({});
        showToast({
          style: Toast.Style.Failure,
          title: "There was an error searching the word",
          message: "Please try again later",
        });
      });
  }, [language, word]);

  useEffect((): void => {
    if (!props.arguments.word && props.fallbackText) {
      clearSearchBar();
    }
  }, []);

  const filteredEntries: GroupedEntry = useMemo((): GroupedEntry => {
    const filtered: GroupedEntry = {};

    Object.entries(groupedEntries).forEach(([partOfSpeech, entry]: [string, GroupedEntry[string]]): void => {
      const filteredSenses: Sense[] = entry.senses.filter((sense: Sense): boolean =>
        sense.definition.toLowerCase().includes(searchText.toLowerCase()),
      );

      if (filteredSenses.length) {
        filtered[partOfSpeech] = { ...entry, senses: filteredSenses };
      }
    });

    return filtered;
  }, [groupedEntries, searchText]);

  useEffect((): void => {
    const checkFavorites: () => Promise<void> = async (): Promise<void> => {
      const favs: Record<string, boolean> = await Favorite.existMultiple(filteredEntries, word);
      setFavorites({ ...favs });
    };

    if (Object.keys(filteredEntries).length) checkFavorites();
  }, [filteredEntries, languageFull, word]);

  if (!language) {
    return (
      <Detail
        markdown={`Please select a language for your query or set a default one in Preferences`}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Command Preferences" onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={loading ? "Loading. Please wait..." : "Filter by definition..."}
      filtering={false}
      isShowingDetail={true}
    >
      {!Object.keys(filteredEntries).length ? (
        <List.EmptyView title="No definitions found" />
      ) : (
        Object.entries(filteredEntries).map(
          ([partOfSpeech, entry]: [string, GroupedEntry[string]], i: number): React.ReactNode => {
            const color: Color = colors[i % colors.length];

            return (
              <List.Section
                key={partOfSpeech}
                title={`${Dictionary.capitalize(partOfSpeech)} (${entry.senses.length})`}
              >
                {entry.senses.map((sense: Sense, j: number): React.ReactNode => {
                  const favKey: string = `${partOfSpeech}-${j}`;
                  const isFavorite: boolean = favorites[favKey] || false;

                  return (
                    <List.Item
                      key={`${word}-${partOfSpeech}-${j}`}
                      title={""}
                      accessories={isFavorite ? [{ icon: Icon.Star }] : []}
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
                                    message: `"${word}" (${Dictionary.capitalize(languageFull)}) has been added to your favorites`,
                                  });
                                  setFavorites(
                                    (prev: Record<string, boolean>): Record<string, boolean> => ({
                                      ...prev,
                                      [favKey]: true,
                                    }),
                                  );
                                } else {
                                  await showToast({
                                    style: Toast.Style.Failure,
                                    title: "Failed to add to Favorites",
                                    message: `"${word}" (${Dictionary.capitalize(languageFull)}) is already in your favorites`,
                                  });
                                }
                              } else {
                                const options: Alert.Options = {
                                  title: "Remove from Favorites",
                                  message: `"${word}" (${Dictionary.capitalize(languageFull)}) will be removed from your favorites`,
                                  primaryAction: {
                                    title: "Delete",
                                    style: Alert.ActionStyle.Destructive,
                                    onAction: async (): Promise<void> => {
                                      await showToast({
                                        style: Toast.Style.Success,
                                        title: "Removed from Favorites",
                                        message: `"${word}" (${Dictionary.capitalize(languageFull)}) has been removed from your favorites`,
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
                                    setFavorites(
                                      (prev: Record<string, boolean>): Record<string, boolean> => ({
                                        ...prev,
                                        [favKey]: false,
                                      }),
                                    );
                                  } else {
                                    await showToast({
                                      style: Toast.Style.Failure,
                                      title: "Failed to remove from Favorites",
                                      message: `"${word}" (${Dictionary.capitalize(languageFull)}) is not in your favorites`,
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
                                `The definitions for "${word}" (${Dictionary.capitalize(languageFull)}) have been copied to clipboard`,
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
          },
        )
      )}
    </List>
  );
}
