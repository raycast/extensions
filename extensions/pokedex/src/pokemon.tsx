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
import pokedexData from "./statics/pokedex.json";
import { getPokemonImage, localeName, nationalDexNumber } from "./utils";

const { language } = getPreferenceValues();

interface LocalPokemon {
  id: number;
  name: string;
  types: string[];
  artwork: string;
  generation: string;
  image_s: string;
  image_m: string;
  localization: Record<string, string>;
  stats?: {
    hp: number;
    attack: number;
    defense: number;
    special_attack: number;
    special_defense: number;
    speed: number;
  };
}

const pokedex = pokedexData as LocalPokemon[];

export default function NationalPokedex(props: {
  arguments: { search?: string };
}) {
  const { search } = props.arguments;
  const [type, setType] = useState<string>("all");
  const [sort, setSort] = useState<string>("lowest");
  const [randomization, setRandomization] = useState<boolean>(false);
  const [pokemons, setPokemons] = useState<LocalPokemon[]>(pokedex);

  useEffect(() => {
    const shuffled = shuffle(pokemons);
    setPokemons(shuffled);
  }, [randomization]);

  useEffect(() => {
    const sorted = orderBy(pokedex, ...sort.split("|"));
    const filtered =
      type != "all"
        ? sorted.filter((p) =>
            p.types.map((t) => t.toLowerCase()).includes(type),
          )
        : sorted;

    const searched = search
      ? filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.id.toString() === search,
        )
      : filtered;

    setPokemons(searched);
  }, [type, sort, search]);

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
                const statsString = pokemon.stats
                  ? `H:${pokemon.stats.hp} A:${pokemon.stats.attack} D:${pokemon.stats.defense} C:${pokemon.stats.special_attack} S:${pokemon.stats.special_defense} Sp:${pokemon.stats.speed}`
                  : "";

                return (
                  <Grid.Item
                    key={pokemon.id}
                    content={getPokemonImage(pokemon.id)}
                    title={localeName(pokemon, language)}
                    subtitle={`${nationalDexNumber(pokemon.id)} ${statsString}`}
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
