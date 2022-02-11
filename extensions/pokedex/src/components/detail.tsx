import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPokemon } from "../api";
import type { PokemonV2Pokemon, PokemonV2Pokemonspecy } from "../types";

type PropsType = {
  id: number;
  name: string;
};

export default function PokemonDetail(props: PropsType) {
  const [loading, setLoading] = useState<boolean>(false);
  const [pokemons, setPokemons] = useState<PokemonV2Pokemon[]>([]);

  useEffect(() => {
    setLoading(true);
    getPokemon(props.id)
      .then((data) => {
        setPokemons(data);
        setLoading(false);
      })
      .catch(() => {
        setPokemons([]);
        setLoading(false);
      });
  }, [props.id]);

  const accessoryTitle = (specy: PokemonV2Pokemonspecy): string => {
    if (specy.is_baby) return "Baby";
    if (specy.is_legendary) return "Legendary";
    if (specy.is_mythical) return "Mythical";

    return "";
  };

  const abilities = (pkm: PokemonV2Pokemon) =>
    pkm.pokemon_v2_pokemonabilities_aggregate.nodes
      .map((a) => {
        if (a.is_hidden) {
          return `${a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name} (hidden)`;
        }

        return a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name;
      })
      .join(", ");

  const pkmNumber = (id: number) => {
    return id.toString().padStart(3, "0");
  };

  return (
    <List isLoading={loading} navigationTitle={props.name}>
      {pokemons.map((pokemon) => {
        return (
          <>
            <List.Section>
              <List.Item
                key={pokemon.id}
                title={
                  pokemon.pokemon_v2_pokemonspecy
                    .pokemon_v2_pokemonspeciesnames[0].name
                }
                subtitle={`#${pkmNumber(pokemon.id)}`}
                accessoryTitle={accessoryTitle(pokemon.pokemon_v2_pokemonspecy)}
                icon={{
                  source: `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${pkmNumber(
                    pokemon.id
                  )}.png`,
                }}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction
                      url={`https://www.pokemon.com/us/pokedex/${pokemon.pokemon_v2_pokemonspecy.name}`}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
            <List.Section title="Pokédex data">
              <List.Item
                key="type"
                title="Type"
                subtitle={pokemon.pokemon_v2_pokemontypes_aggregate.nodes
                  .map((n) => n.pokemon_v2_type.pokemon_v2_typenames[0].name)
                  .join(", ")}
              />
              <List.Item
                key="height"
                title="Height"
                subtitle={`${pokemon.height / 10}m`}
              />
              <List.Item
                key="weight"
                title="Weight"
                subtitle={`${pokemon.weight / 10}kg`}
              />
              <List.Item
                key="abilities"
                title="Abilities"
                subtitle={abilities(pokemon)}
              />
            </List.Section>
            <List.Section
              title="Base stats"
              subtitle={pokemon.pokemon_v2_pokemonstats_aggregate.aggregate.sum.base_stat.toString()}
            >
              {pokemon.pokemon_v2_pokemonstats_aggregate.nodes.map((n) => {
                return (
                  <List.Item
                    key={n.pokemon_v2_stat.name}
                    title={n.pokemon_v2_stat.pokemon_v2_statnames[0].name}
                    subtitle={n.base_stat.toString()}
                  />
                );
              })}
            </List.Section>
            <List.Section title="Pokédex entries">
              {pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemonspeciesflavortexts
                .filter(
                  (f) => f.pokemon_v2_version.pokemon_v2_versionnames.length
                )
                .map((flavor) => {
                  return (
                    <List.Item
                      key={flavor.pokemon_v2_version.name}
                      title={
                        flavor.pokemon_v2_version.pokemon_v2_versionnames[0]
                          .name
                      }
                      subtitle={flavor.flavor_text.split("\n").join(" ")}
                    />
                  );
                })}
            </List.Section>
          </>
        );
      })}
    </List>
  );
}
