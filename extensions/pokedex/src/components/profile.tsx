import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { useMemo } from "react";
import { fetchPokemonWithCaching } from "../api";
import { PokemonV2Pokemonspeciesname, PokemonV2Pokemonspecy } from "../types";
import { getOfficialArtworkImg, nationalDexNumber } from "../utils";
import PokemonEncounters from "./encounter";
import PokedexEntries from "./entry";
import PokemonForms from "./form";
import PokemonMetadata from "./metadata/pokemon";
import WeaknessMetadata from "./metadata/weakness";
import PokemonLearnset from "./pokemon_learnset";

const { language } = getPreferenceValues();

enum GrowthRate {
  "Slow" = 1,
  "Medium" = 2,
  "Fast" = 3,
  "Medium Slow" = 4,
  "Erratic" = 5,
  "Fluctuating" = 6,
}

export default function PokeProfile(props: { id: number }) {
  const { data: pokemon, isLoading } = usePromise(fetchPokemonWithCaching, [
    props.id,
  ]);

  const nameByLang = useMemo(() => {
    if (!pokemon) return {};

    return pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemonspeciesnames.reduce(
      (prev: Record<string, PokemonV2Pokemonspeciesname>, curr) => {
        prev[curr.language_id] = curr;
        return prev;
      },
      {},
    );
  }, [pokemon]);

  const evolutions = (species: PokemonV2Pokemonspecy[]) => {
    const first = species.find((s) => !s.evolves_from_species_id);
    if (!first) return [];

    const seconds = species.filter(
      (s) => s.evolves_from_species_id === first.id,
    );

    return seconds.map((second) => {
      const third = species.find(
        (s) => s.evolves_from_species_id === second.id,
      );

      return third ? [first, second, third] : [first, second];
    });
  };

  const dataObject: json2md.DataObject = useMemo(() => {
    if (!pokemon) return [];

    const { pokemon_v2_pokemonspecy } = pokemon;

    const {
      pokemon_v2_evolutionchain,
      pokemon_v2_pokemonegggroups,
      pokemon_v2_pokemonspeciesflavortexts,
    } = pokemon_v2_pokemonspecy;

    const ev: string[] = [];

    const data = [
      {
        h1: `${nationalDexNumber(pokemon.id)} ${nameByLang[language].name}`,
      },
      {
        p: nameByLang["2"]
          ? `${nameByLang["1"].name} (${nameByLang["2"].name})`
          : nameByLang["1"].name,
      },
      {
        h3: nameByLang[language].genus,
      },
      {
        p: pokemon_v2_pokemonspeciesflavortexts.length
          ? pokemon_v2_pokemonspeciesflavortexts
              .reverse()[0]
              .flavor_text.split("\n")
              .join(" ")
          : "",
      },
      {
        img: {
          title: nameByLang[language].name,
          source: getOfficialArtworkImg(pokemon.id),
        },
      },
      {
        h2: "Training",
      },
      {
        p: `_EV yield:_ ${ev.join(", ")}`,
      },
      {
        p: `_Catch rate:_ ${pokemon_v2_pokemonspecy.capture_rate}`,
      },
      {
        p: `_Base friendship:_ ${pokemon_v2_pokemonspecy.base_happiness}`,
      },
      {
        p: `_Base experience:_ ${pokemon.base_experience || ""}`,
      },
      {
        p: `_Growth rate:_ ${
          GrowthRate[pokemon_v2_pokemonspecy.growth_rate_id]
        }`,
      },
      {
        h2: "Breeding",
      },
      {
        p: `_Egg groups:_ ${pokemon_v2_pokemonegggroups
          .map(
            (g) =>
              g.pokemon_v2_egggroup.pokemon_v2_egggroupnames[0]?.name ||
              g.pokemon_v2_egggroup.name,
          )
          .join(", ")}`,
      },
      {
        p: `_Egg cycles:_ ${pokemon_v2_pokemonspecy.hatch_counter}`,
      },
    ];

    if (pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies.length) {
      data.push(
        {
          h2: "Evolutions",
        },
        {
          p:
            pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies.length < 2
              ? "_This Pokémon does not evolve._"
              : "",
        },
        ...evolutions(pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies).map(
          (evolution) => ({
            p: evolution
              .map((specy) => {
                return `![${
                  specy.pokemon_v2_pokemonspeciesnames[0].name
                }](${getOfficialArtworkImg(specy.id)})`;
              })
              .join(" "),
          }),
        ),
      );
    }

    return data;
  }, [pokemon]);

  const englishName = nameByLang["9"]?.name.replace(/ /g, "_");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={
        pokemon ? `${nameByLang[language].name} | Pokédex` : "Pokédex"
      }
      markdown={json2md(dataObject)}
      metadata={
        pokemon && (
          <Detail.Metadata>
            <Detail.Metadata.Link
              title="Official Pokémon Website"
              text={nameByLang[language].name}
              target={
                language === "1"
                  ? `https://zukan.pokemon.co.jp/detail/${pokemon.id}`
                  : `https://www.pokemon.com/us/pokedex/${pokemon.pokemon_v2_pokemonspecy.name}`
              }
            />
            <Detail.Metadata.Link
              title="Bulbapedia"
              text={englishName}
              target={`https://bulbapedia.bulbagarden.net/wiki/${englishName}_(Pok%C3%A9mon)`}
            />
            <Detail.Metadata.Separator />
            <PokemonMetadata type="detail" pokemon={pokemon} />
            {pokemon.pokemon_v2_pokemonspecy.gender_rate === -1 ? (
              <Detail.Metadata.Label title="Gender" text="Unknown" />
            ) : (
              <Detail.Metadata.TagList title="Gender">
                <Detail.Metadata.TagList.Item
                  text={`${((8 - pokemon.pokemon_v2_pokemonspecy.gender_rate) / 8) * 100}%`}
                  icon={Icon.Male}
                  color={Color.Blue}
                />
                <Detail.Metadata.TagList.Item
                  text={`${(pokemon.pokemon_v2_pokemonspecy.gender_rate / 8) * 100}%`}
                  icon={Icon.Female}
                  color={Color.Magenta}
                />
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Label
              title="Shape"
              icon={{
                source: `body-style/${pokemon.pokemon_v2_pokemonspecy.pokemon_shape_id}.png`,
              }}
            />
            <Detail.Metadata.Separator />
            <WeaknessMetadata
              type="detail"
              types={pokemon.pokemon_v2_pokemontypes}
            />
            <Detail.Metadata.Separator />
            {pokemon.pokemon_v2_pokemonstats.map((stat, idx) => {
              return (
                <Detail.Metadata.Label
                  key={idx}
                  title={stat.pokemon_v2_stat.pokemon_v2_statnames[0].name}
                  text={stat.base_stat.toString()}
                />
              );
            })}
          </Detail.Metadata>
        )
      }
      actions={
        pokemon && (
          <ActionPanel>
            <ActionPanel.Section title="Information">
              <Action.Push
                title="Pokédex Entries"
                icon={Icon.List}
                target={
                  <PokedexEntries
                    name={nameByLang[language].name}
                    dex_numbers={
                      pokemon.pokemon_v2_pokemonspecy
                        .pokemon_v2_pokemondexnumbers
                    }
                    entries={
                      pokemon.pokemon_v2_pokemonspecy
                        .pokemon_v2_pokemonspeciesflavortexts
                    }
                  />
                }
              />
              <Action.Push
                title="Forms"
                icon={Icon.List}
                target={
                  <PokemonForms
                    id={pokemon.id}
                    name={nameByLang[language].name}
                    pokemons={
                      pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemons
                    }
                  />
                }
              />
              <Action.Push
                title="Learnset"
                icon={Icon.List}
                target={
                  <PokemonLearnset
                    name={nameByLang[language].name}
                    moves={pokemon.pokemon_v2_pokemonmoves}
                  />
                }
              />
              <Action.Push
                title="Where to Find"
                icon={Icon.List}
                target={
                  <PokemonEncounters
                    name={nameByLang[language].name}
                    encounters={pokemon.pokemon_v2_encounters}
                  />
                }
              />
            </ActionPanel.Section>
            {pokemon.pokemon_v2_pokemonspecy.pokemon_v2_evolutionchain
              .pokemon_v2_pokemonspecies.length >= 2 && (
              <ActionPanel.Section title="Evolutions">
                {pokemon.pokemon_v2_pokemonspecy.pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies.map(
                  (specy) => {
                    return (
                      <Action.Push
                        key={specy.id}
                        title={specy.pokemon_v2_pokemonspeciesnames[0].name}
                        icon="pokeball.svg"
                        target={<PokeProfile id={specy.id} />}
                      />
                    );
                  },
                )}
              </ActionPanel.Section>
            )}
          </ActionPanel>
        )
      }
    />
  );
}
