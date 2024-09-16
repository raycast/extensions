import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import groupBy from "lodash.groupby";
import { useMemo, useState } from "react";
import PokemonDetail from "./components/detail";
import TypeDropdown from "./components/type_dropdown";

import pokedex from "./statics/pokedex.json";

const { language } = getPreferenceValues();

export default function SearchPokemon() {
  const [type, setType] = useState<string>("all");

  const pokemons = useMemo(() => {
    return type != "all"
      ? pokedex.filter((p) => p.types.includes(type))
      : pokedex;
  }, [type]);

  return (
    <Grid
      throttle
      searchBarPlaceholder="Search for Pokémon by name or Pokédex number"
      searchBarAccessory={
        <TypeDropdown type="grid" command="Pokémon" onSelectType={setType} />
      }
    >
      {Object.entries(groupBy(pokemons, "generation")).map(
        ([generation, pokemonList]) => {
          return (
            <Grid.Section title={generation} key={generation}>
              {pokemonList.map((pokemon) => {
                return (
                  <Grid.Item
                    key={pokemon.id}
                    content={pokemon.artwork}
                    title={language === "1" ? pokemon.jp_name : pokemon.name}
                    subtitle={`#${pokemon.id.toString().padStart(4, "0")}`}
                    keywords={[pokemon.id.toString(), pokemon.name]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Show Details"
                          icon={Icon.Sidebar}
                          target={<PokemonDetail id={pokemon.id} />}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </Grid.Section>
          );
        },
      )}
    </Grid>
  );
}
