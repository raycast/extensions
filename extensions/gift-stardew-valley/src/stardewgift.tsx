import { List } from "@raycast/api";
import CharacterDetail from "./components/CharacterDetail";
import type { GiftData } from "./types.d";
import data from "./data/data.json";
import { useMemo, useState } from "react";

function getImageURL(name: string) {
  return `https://raw.githubusercontent.com/Razberrry/svwiki/main/${name}.png`;
}

const characters = (data as GiftData).characters;

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const filteredCharacters = useMemo(
    () =>
      characters.filter(
        (character) =>
          character.name.toLowerCase().includes(searchText.toLowerCase()) ||
          character.loves.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())) ||
          character.likes.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())) ||
          character.hates.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())) ||
          character.dislikes.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())),
      ),
    [searchText],
  );

  return (
    <List isShowingDetail onSearchTextChange={setSearchText} searchBarPlaceholder="Search for a character or gift...">
      <List.EmptyView title="No characters or gifts found" description="Try a different search term." />
      {filteredCharacters.map((character) => (
        <List.Item
          key={character.name}
          icon={getImageURL(character.name)}
          title={character.name}
          detail={<CharacterDetail character={character} />}
        />
      ))}
    </List>
  );
}
