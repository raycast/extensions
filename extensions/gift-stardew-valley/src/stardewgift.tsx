import { List } from "@raycast/api";
import data from "./data/data.json";
import CharacterDetail from "./components/CharacterDetail";
import { useState, useEffect } from "react";

function getImageURL(name: string) {
  return `https://raw.githubusercontent.com/Razberrry/svwiki/main/${name}.png`;
}

export default function Command() {
  const characters: Character[] = data.characters;

  const [searchText, setSearchText] = useState("");
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>(characters);

  useEffect(() => {
    setFilteredCharacters(
      characters.filter(
        (character) =>
          character.name.toLowerCase().includes(searchText.toLowerCase()) ||
          character.loves.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())) ||
          character.likes.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())) ||
          character.hates.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())) ||
          character.dislikes.some((gift) => gift.name.toLowerCase().includes(searchText.toLowerCase())),
      ),
    );
  }, [searchText, characters]);

  return (
    <List isShowingDetail onSearchTextChange={setSearchText} searchBarPlaceholder="Search for a character or gift...">
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
