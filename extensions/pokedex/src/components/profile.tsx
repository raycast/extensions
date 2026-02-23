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
import { fetchPokemon } from "../api";
import { PokemonSpeciesName, Pokemon, EvolutionSpecies } from "../types";
import {
  fixFlavorText,
  getMarkdownPokemonImage,
  nationalDexNumber,
} from "../utils";
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
  const { data: pokemon, isLoading } = usePromise(fetchPokemon, [props.id]);

  const nameByLang = useMemo(() => {
    if (!pokemon) return {};

    return pokemon.pokemonspecy.pokemonspeciesnames.reduce(
      (prev: Record<string, PokemonSpeciesName>, curr) => {
        prev[curr.language_id] = curr;
        return prev;
      },
      {},
    );
  }, [pokemon]);

  const evolutions = (species: EvolutionSpecies[]) => {
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

    const species = pokemon.pokemonspecy;
    const pokemonegggroups = species.pokemonegggroups;
    const pokemonspeciesflavortexts = species.pokemonspeciesflavortexts;
    const evolutionchain = species.evolutionchain;

    // get descriptions from latest generation
    const generations = pokemonspeciesflavortexts.map(
      (f) => f.version.versiongroup.generation_id,
    );
    const latest = generations.sort().reverse()[0];

    const flavors = pokemonspeciesflavortexts.filter(
      (f) => f.version.versiongroup.generation_id === latest,
    );

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
        p: fixFlavorText(flavors[0]?.flavor_text),
      },
      {
        p: getMarkdownPokemonImage(pokemon.id),
      },
      {
        h2: "Training",
      },
      {
        p: `_EV yield:_ ${ev.join(", ")}`,
      },
      {
        p: `_Catch rate:_ ${species.capture_rate}`,
      },
      {
        p: `_Base friendship:_ ${species.base_happiness}`,
      },
      {
        p: `_Base experience:_ ${pokemon.base_experience || ""}`,
      },
      {
        p: `_Growth rate:_ ${GrowthRate[species.growth_rate_id]}`,
      },
      {
        h2: "Breeding",
      },
      {
        p: `_Egg groups:_ ${pokemonegggroups
          .map((g) => g.egggroup.egggroupnames[0]?.name || g.egggroup.name)
          .join(", ")}`,
      },
      {
        p: `_Egg cycles:_ ${species.hatch_counter}`,
      },
    ];

    if (evolutionchain?.pokemonspecies.length) {
      data.push(
        {
          h2: "Evolutions",
        },
        {
          p:
            evolutionchain.pokemonspecies.length < 2
              ? "_This Pokémon does not evolve._"
              : "",
        },
        ...evolutions(evolutionchain.pokemonspecies).map((evolution) => ({
          p: evolution
            .map((specy) => getMarkdownPokemonImage(specy.id))
            .join(" "),
        })),
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
                  : `https://www.pokemon.com/us/pokedex/${pokemon.pokemonspecy.name}`
              }
            />
            <Detail.Metadata.Link
              title="Bulbapedia"
              text={englishName}
              target={`https://bulbapedia.bulbagarden.net/wiki/${englishName}_(Pok%C3%A9mon)`}
            />
            <Detail.Metadata.Separator />
            <PokemonMetadata type="detail" pokemon={pokemon} />
            {pokemon.pokemonspecy.gender_rate === -1 ? (
              <Detail.Metadata.Label title="Gender" text="Unknown" />
            ) : (
              <Detail.Metadata.TagList title="Gender">
                <Detail.Metadata.TagList.Item
                  text={`${((8 - pokemon.pokemonspecy.gender_rate) / 8) * 100}%`}
                  icon={Icon.Male}
                  color={Color.Blue}
                />
                <Detail.Metadata.TagList.Item
                  text={`${(pokemon.pokemonspecy.gender_rate / 8) * 100}%`}
                  icon={Icon.Female}
                  color={Color.Magenta}
                />
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Label
              title="Shape"
              icon={{
                source: `body-style/${pokemon.pokemonspecy.pokemon_shape_id}.png`,
              }}
            />
            <Detail.Metadata.Separator />
            <WeaknessMetadata type="detail" types={pokemon.pokemontypes} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Base Stats">
              {pokemon.pokemonstats.map((stat, idx) => (
                <Detail.Metadata.TagList.Item
                  key={idx}
                  text={`${stat.stat.statnames[0].name}: ${stat.base_stat}`}
                  color={
                    stat.stat.name.startsWith("special")
                      ? Color.Green
                      : Color.Yellow
                  }
                />
              ))}
            </Detail.Metadata.TagList>
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
                    dex_numbers={pokemon.pokemonspecy.pokemondexnumbers}
                    entries={pokemon.pokemonspecy.pokemonspeciesflavortexts}
                  />
                }
              />
              <Action.Push
                title="Forms"
                icon={Icon.Layers}
                target={
                  <PokemonForms
                    id={pokemon.id}
                    name={nameByLang[language].name}
                    pokemons={
                      pokemon.pokemonspecy.pokemons as unknown as Pokemon[]
                    }
                  />
                }
              />
              <Action.Push
                title="Learnset"
                icon={Icon.LightBulb}
                target={
                  <PokemonLearnset
                    name={nameByLang[language].name}
                    moves={pokemon.pokemonmoves}
                  />
                }
              />
              <Action.Push
                title="Where to Find"
                icon={Icon.Map}
                target={
                  <PokemonEncounters
                    name={nameByLang[language].name}
                    encounters={pokemon.encounters}
                  />
                }
              />
            </ActionPanel.Section>
            {pokemon.pokemonspecy.evolutionchain.pokemonspecies.length >= 2 && (
              <ActionPanel.Section title="Evolutions">
                {pokemon.pokemonspecy.evolutionchain.pokemonspecies.map(
                  (specy) => {
                    return (
                      <Action.Push
                        key={specy.id}
                        title={specy.pokemonspeciesnames[0].name}
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
