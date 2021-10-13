import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

export default function Command() {
  const [isLoading, setLoading] = useState(false);
  const [pokemon, setPokemon] = useState({
    id: 1,
    name: "bulbasaur",
    sprites: {
      front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
    },
  });

  const handleSearch = async (text: string) => {
    setLoading(true);
    const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + text);
    if (response.status === 200) {
      const data: any = await response.json();
      setPokemon(data);
      setLoading(false);
    }
  };

  return (
    <List
      navigationTitle="Pokedex"
      isLoading={isLoading}
      searchBarPlaceholder={"Insert Pokemon name"}
      onSearchTextChange={(text) => handleSearch(text)}
    >
      {pokemon.id && (
        <List.Item
          key={pokemon.id}
          title={pokemon.name}
          subtitle={`pokedex number: ` + pokemon.id}
          icon={{ source: pokemon.sprites.front_default }}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://www.wikidex.net/wiki/` + pokemon?.name} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
