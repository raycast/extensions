import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import json2md from "json2md";
import uniqBy from "lodash.uniqby";
import { useEffect, useMemo, useState } from "react";
import { getPokemon } from "../api";
import {
  PokemonV2Pokemon,
  PokemonV2Pokemonspeciesname,
  PokemonV2PokemonspecyElement,
} from "../types";
import { calculateEffectiveness, typeColor } from "../utils";
import PokedexEntries from "./dex";
import PokemonEncounters from "./encounter";
import PokemonForms from "./form";
import PokemonMoves from "./move";

const { language } = getPreferenceValues();

type SpeciesNameByLanguage = {
  [lang: string]: PokemonV2Pokemonspeciesname;
};

enum GrowthRate {
  "Slow" = 1,
  "Medium" = 2,
  "Fast" = 3,
  "Medium Slow" = 4,
  "Erratic" = 5,
  "Fluctuating" = 6,
}

function random(lower: number, upper: number) {
  return lower + Math.floor(Math.random() * (upper - lower + 1));
}

export default function PokemonDetail(props: { id?: number }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [pokemon, setPokemon] = useState<PokemonV2Pokemon | undefined>(
    undefined,
  );
  const [effectiveness, setEffectiveness] = useState<{
    normal: string[];
    weak: string[];
    immune: string[];
    resistant: string[];
  }>({ normal: [], weak: [], immune: [], resistant: [] });

  useEffect(() => {
    setLoading(true);
    getPokemon(props.id || random(1, 905), Number(language))
      .then((data) => {
        setPokemon(data[0]);

        const typeEffectiveness = calculateEffectiveness(
          data[0].pokemon_v2_pokemontypes,
        );
        setEffectiveness(typeEffectiveness);

        setLoading(false);
      })
      .catch(() => {
        setPokemon(undefined);
        setLoading(false);
      });
  }, [props.id]);

  const nameByLang = useMemo(() => {
    if (!pokemon) return {};

    return pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemonspeciesnames.reduce(
      (prev: SpeciesNameByLanguage, curr) => {
        prev[curr.language_id] = curr;
        return prev;
      },
      {},
    );
  }, [pokemon]);

  const evolutions = (species: PokemonV2PokemonspecyElement[]) => {
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

    const pkmNumber = pokemon.id.toString().padStart(3, "0");

    let gender;
    if (pokemon_v2_pokemonspecy.gender_rate === -1) {
      gender = "Unknown";
    } else {
      const male = ((8 - pokemon_v2_pokemonspecy.gender_rate) / 8) * 100;
      const female = (pokemon_v2_pokemonspecy.gender_rate / 8) * 100;
      gender = `${male}% male, ${female}% female`;
    }

    const ev: string[] = [];

    const data = [
      {
        h1: `#${pokemon.id.toString().padStart(4, "0")} ${
          nameByLang[language].name
        }`,
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
          source: `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${pkmNumber}.png`,
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
        p: `_Gender:_ ${gender}`,
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
                }](https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${specy.id
                  .toString()
                  .padStart(3, "0")}.png)`;
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
      isLoading={loading}
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
              target={`https://www.pokemon.com/us/pokedex/${pokemon.pokemon_v2_pokemonspecy.name}`}
            />
            <Detail.Metadata.Link
              title="Bulbapedia"
              text={englishName}
              target={`https://bulbapedia.bulbagarden.net/wiki/${englishName}_(Pok%C3%A9mon)`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Height"
              text={`${pokemon.height / 10}m`}
            />
            <Detail.Metadata.Label
              title="Weight"
              text={`${pokemon.weight / 10}kg`}
            />
            <Detail.Metadata.TagList title="Type">
              {pokemon.pokemon_v2_pokemontypes.map((t) => {
                return (
                  <Detail.Metadata.TagList.Item
                    key={t.pokemon_v2_type.pokemon_v2_typenames[0].name}
                    text={t.pokemon_v2_type.pokemon_v2_typenames[0].name}
                    color={typeColor[t.pokemon_v2_type.name]}
                  />
                );
              })}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Abilities">
              {uniqBy(
                pokemon.pokemon_v2_pokemonabilities,
                (a) => a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name,
              ).map((t) => {
                return (
                  <Detail.Metadata.TagList.Item
                    key={t.pokemon_v2_ability.pokemon_v2_abilitynames[0].name}
                    text={t.pokemon_v2_ability.pokemon_v2_abilitynames[0].name}
                    color={
                      t.is_hidden ? Color.SecondaryText : Color.PrimaryText
                    }
                  />
                );
              })}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            {effectiveness.weak.length > 0 && (
              <Detail.Metadata.TagList title="Weak to">
                {effectiveness.weak.map((weakness, index) => (
                  <Detail.Metadata.TagList.Item
                    key={index}
                    text={weakness}
                    color={typeColor[weakness.split(" ")[1].toLowerCase()]}
                  />
                ))}
              </Detail.Metadata.TagList>
            )}
            {effectiveness.resistant.length > 0 && (
              <Detail.Metadata.TagList title="Resistant to">
                {effectiveness.resistant.map((resistance, index) => (
                  <Detail.Metadata.TagList.Item
                    key={index}
                    text={resistance}
                    color={typeColor[resistance.split(" ")[1].toLowerCase()]}
                  />
                ))}
              </Detail.Metadata.TagList>
            )}
            {effectiveness.immune.length > 0 && (
              <Detail.Metadata.TagList title="Immune to">
                {effectiveness.immune.map((immunity, index) => (
                  <Detail.Metadata.TagList.Item
                    key={index}
                    text={immunity}
                    color={typeColor[immunity.toLowerCase()]}
                  />
                ))}
              </Detail.Metadata.TagList>
            )}
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
            <Action.Push
              title="Pokédex Entries"
              icon={Icon.List}
              target={
                <PokedexEntries
                  name={nameByLang[language].name}
                  dex_numbers={
                    pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemondexnumbers
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
                  pokemons={pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemons}
                />
              }
            />
            <Action.Push
              title="Learnset"
              icon={Icon.List}
              target={
                <PokemonMoves
                  name={nameByLang[language].name}
                  moves={pokemon.pokemon_v2_pokemonmoves}
                />
              }
            />
            <Action.Push
              title="Where to find"
              icon={Icon.List}
              target={
                <PokemonEncounters
                  name={nameByLang[language].name}
                  encounters={pokemon.pokemon_v2_encounters}
                />
              }
            />
          </ActionPanel>
        )
      }
    />
  );
}
