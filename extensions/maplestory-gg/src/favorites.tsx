import { useEffect, useState } from "react";
import { Action, ActionPanel, Grid, useNavigation } from "@raycast/api";
import { CharacterDetail } from "./components.js";
import { getFavoriteCharacters, sortCharacters } from "./utils.js";
import { CharacterData } from "./types.js";

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
      {favoriteCharacters?.map((character) => (
        <Grid.Item
          id={character.Name}
          key={character.Name}
          title={character.Name}
          subtitle={`Lv.${character.Level}`}
          content={{ value: character.CharacterImageURL, tooltip: `Lv.${character.Level}` }}
          actions={
            <ActionPanel>
              <Action
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
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
