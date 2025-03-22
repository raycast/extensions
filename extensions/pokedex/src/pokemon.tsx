import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import shuffle from "lodash.shuffle";
import { useEffect, useState } from "react";
import PokeProfile from "./components/profile";
import TypeDropdown from "./components/type_dropdown";
import pokedex from "./statics/pokedex.json";
import { getContentImg, localeName, nationalDexNumber } from "./utils";

const { language } = getPreferenceValues();

export default function NationalPokedex() {
  const [type, setType] = useState<string>("all");
  const [sort, setSort] = useState<string>("lowest");
  const [randomization, setRandomization] = useState<boolean>(false);
  const [pokemons, setPokemons] = useState(pokedex);

  useEffect(() => {
    const shuffled = shuffle(pokemons);
    setPokemons(shuffled);
  }, [randomization]);

  useEffect(() => {
    const sorted = orderBy(pokedex, ...sort.split("|"));
    const filtered =
      type != "all" ? sorted.filter((p) => p.types.includes(type)) : sorted;

    setPokemons(filtered);
  }, [type, sort]);

  return (
    <Grid
      throttle
      columns={6}
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
                    content={getContentImg(pokemon.id)}
                    title={localeName(pokemon, language)}
                    subtitle={nationalDexNumber(pokemon.id)}
                    keywords={[pokemon.id.toString(), pokemon.name]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Information">
                          <Action.Push
                            title="Pokémon Profile"
                            icon={Icon.Sidebar}
                            target={<PokeProfile id={pokemon.id} />}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Randomize">
                          <Action
                            title="Surprise Me!"
                            icon={Icon.Shuffle}
                            onAction={() => setRandomization(!randomization)}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Sort By">
                          <Action
                            title="Number (Lowest First)"
                            icon={Icon.ArrowUp}
                            onAction={() => setSort("id|asc")}
                          />
                          <Action
                            title="Number (Highest First)"
                            icon={Icon.ArrowDown}
                            onAction={() => setSort("id|desc")}
                          />
                          <Action
                            title="Name (A-Z)"
                            icon={Icon.Text}
                            onAction={() => setSort("name|asc")}
                          />
                          <Action
                            title="Name (Z-A)"
                            icon={Icon.Text}
                            onAction={() => setSort("name|desc")}
                          />
                        </ActionPanel.Section>
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
