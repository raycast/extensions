import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import groupBy from "lodash.groupby";
import PokemonDetail from "./components/detail";

import pokemon from "./pokemon.json";

const listing = groupBy(pokemon, "generation");

type Generation = {
  [geneartion: string]: Pokemon[];
};

type Pokemon = {
  id: number;
  name: string;
  types: string[];
  artwork: string;
  generation: string;
};

export default function SearchPokemon() {
  const { push } = useNavigation();

  const [nameOrId, setNameOrId] = useState<string>("");
  const [generation, setGeneration] = useState<Generation>(listing);

  useEffect(() => {
    if (nameOrId.length > 0) {
      const filtered = pokemon.filter(
        (p: Pokemon) =>
          p.name.toLowerCase().includes(nameOrId.toLowerCase()) ||
          p.id === Number(nameOrId)
      );
      const grouped = groupBy(filtered, "generation");
      setGeneration(grouped);
    }
  }, [nameOrId]);

  const onSearchChange = (newSearch: string) => {
    // backspace
    if (newSearch.length < nameOrId.length) {
      setGeneration(listing);
    }
    setNameOrId(newSearch);
  };

  const pkmNumber = (id: number) => {
    return id.toString().padStart(3, "0");
  };

  return (
    <List
      throttle
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="Search Pokémon by name or number..."
    >
      {Object.entries(generation).map(([generation, pokemons]) => {
        return (
          <List.Section
            title={generation}
            subtitle={pokemons.length.toString()}
          >
            {pokemons.map((pokemon) => (
              <List.Item
                key={pokemon.id}
                title={`#${pkmNumber(pokemon.id)}`}
                subtitle={pokemon.name}
                accessoryTitle={pokemon.types.join(", ")}
                icon={{
                  source: pokemon.artwork,
                }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Item
                      title="See more details"
                      onAction={() =>
                        push(
                          <PokemonDetail id={pokemon.id} name={pokemon.name} />
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
