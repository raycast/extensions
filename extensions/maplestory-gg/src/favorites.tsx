import { useEffect, useState } from "react";
import { Action, ActionPanel, Grid, Icon, launchCommand, LaunchType, useNavigation } from "@raycast/api";
import { CharacterDetail, RemoveFromFavoritesAction } from "./components.js";
import { getFavoriteCharacters, sortCharacters } from "./utils.js";
import { CharacterData } from "./types.js";
import { showFailureToast } from "@raycast/utils";

export default function Favorites() {
  const [isLoading, setIsLoading] = useState(true);
  const [sortCharactersBy, setSortCharactersBy] = useState<string>("");
  const [favoriteCharacters, setFavoriteCharacters] = useState<CharacterData[]>();
  const { push } = useNavigation();

  const loadFavorites = async () => {
    const favoriteCharacters = await getFavoriteCharacters();
    setFavoriteCharacters(sortCharacters(favoriteCharacters, "Level"));
    setIsLoading(false);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (favoriteCharacters) {
      const sortedCharacters = sortCharacters(favoriteCharacters, sortCharactersBy);
      setFavoriteCharacters(sortedCharacters);
    }
  }, [sortCharactersBy]);

  return (
    <Grid
      isLoading={isLoading}
      columns={8}
      searchBarAccessory={
        <Grid.Dropdown storeValue tooltip="Sort Characters" onChange={setSortCharactersBy}>
          <Grid.Dropdown.Item value="Level" title="Sort by Level" />
          <Grid.Dropdown.Item value="Name" title="Sort by Name" />
        </Grid.Dropdown>
      }
    >
      {favoriteCharacters?.length ? (
        favoriteCharacters?.map((character) => (
          <Grid.Item
            id={character.Name}
            key={character.Name}
            title={character.Name}
            subtitle={`Lv.${character.Level}`}
            content={{ value: character.CharacterImageURL, tooltip: `Lv.${character.Level}` }}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.PersonLines}
                  title="View Character"
                  onAction={() => {
                    push(
                      <CharacterDetail
                        checkLatest
                        characterData={character}
                        onRemoveCharacter={() => {
                          loadFavorites();
                        }}
                      />,
                    );
                  }}
                />
                <RemoveFromFavoritesAction
                  characterData={character}
                  onRemoveCharacter={() => {
                    loadFavorites();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <Grid.EmptyView
          icon={{ source: "lucid-empty-view.webp" }}
          title="You haven't favorited any character yet."
          actions={
            <ActionPanel>
              <Action
                title="Lookup Characters"
                onAction={async () => {
                  try {
                    launchCommand({ name: "lookup", type: LaunchType.UserInitiated });
                  } catch {
                    showFailureToast("Lookup command disabled");
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}
