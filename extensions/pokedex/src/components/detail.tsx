import { Color, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import json2md from "json2md";
import { getPokemon } from "../api";
import {
  PokemonV2Pokemon,
  PokemonV2Pokemonspeciesname,
  PokemonV2PokemonspecyElement,
} from "../types";

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

const typeColor: { [key: string]: string } = {
  Normal: "#a8a77a",
  Fire: "#ee8130",
  Water: "#6390f0",
  Electric: "#f7d02c",
  Grass: "#7ac74c",
  Ice: "#96d9d6",
  Fighting: "#c22e28",
  Poison: "#a33ea1",
  Ground: "#e2bf65",
  Flying: "#a98ff3",
  Psychic: "#f95587",
  Bug: "#a6b91a",
  Rock: "#b6a136",
  Ghost: "#735797",
  Dragon: "#6f35fc",
  Dark: "#705746",
  Steel: "#b7b7ce",
  Fairy: "#d685ad",
};

function random(lower: number, upper: number) {
  return lower + Math.floor(Math.random() * (upper - lower + 1));
}

export default function PokemonDetail(props: { id?: number }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [pokemon, setPokemon] = useState<PokemonV2Pokemon | undefined>(
    undefined
  );

  useEffect(() => {
    setLoading(true);
    getPokemon(props.id || random(1, 905), Number(language))
      .then((data) => {
        setPokemon(data[0]);
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
      {}
    );
  }, [pokemon]);

  const formImg = (id: number, formId: number) => {
    const name = formId
      ? `${id.toString().padStart(3, "0")}_f${formId + 1}`
      : id.toString().padStart(3, "0");
    return `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${name}.png`;
  };

  const evolutions = (species: PokemonV2PokemonspecyElement[]) => {
    const first = species.find((s) => !s.evolves_from_species_id);
    if (!first) return [];

    const seconds = species.filter(
      (s) => s.evolves_from_species_id === first.id
    );

    return seconds.map((second) => {
      const third = species.find(
        (s) => s.evolves_from_species_id === second.id
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

    // excluding forms that unavailable in pokemon.com
    let forms = pokemon_v2_pokemonspecy.pokemon_v2_pokemons;
    let formNames: string[] = [];
    switch (pokemon.id) {
      case 25:
        formNames = ["pikachu", "pikachu-gmax"];
        break;
      case 555:
        formNames = ["darmanitan-standard", "darmanitan-galar-standard"];
        break;
      case 744:
        formNames = ["rockruff"];
        break;
      case 774:
        formNames = ["minior-red-meteor", "minior-red"];
        break;
      case 778:
        formNames = ["mimikyu-disguised"];
        break;
      case 849:
        formNames = [
          "toxtricity-amped",
          "toxtricity-low-key",
          "toxtricity-amped-gmax",
        ];
        break;
      case 875:
        // eiscue-noice available in Zukan, but not in pokemon.com at the moment
        formNames = ["eiscue-ice"];
        break;
      default:
        break;
    }

    if (formNames.length) {
      forms = forms.filter((f) => formNames.includes(f.name));
    }

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
        h1: `#${pkmNumber} ${nameByLang[language].name}`,
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
        img: [
          {
            title: nameByLang[language].name,
            source: `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${pkmNumber}.png`,
          },
        ],
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
        p: `_Base exp.:_ ${pokemon.base_experience}`,
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
          .map((g) => g.pokemon_v2_egggroup.pokemon_v2_egggroupnames[0].name)
          .join(", ")}`,
      },
      {
        p: `_Gender:_ ${gender}`,
      },
      {
        p: `_Egg cycles:_ ${pokemon_v2_pokemonspecy.hatch_counter}`,
      },
      {
        h2: forms.length > 1 ? "Forms" : "",
      },
      ...(forms.length > 1
        ? forms.map((p, idx) => {
            return [
              {
                h3:
                  p.pokemon_v2_pokemonforms[0].pokemon_v2_pokemonformnames[0]
                    ?.name || nameByLang[language].name,
              },
              {
                p:
                  "_Type:_ " +
                  p.pokemon_v2_pokemontypes
                    .map((n) => n.pokemon_v2_type.pokemon_v2_typenames[0].name)
                    .join(", "),
              },
              {
                img: [
                  {
                    title:
                      p.pokemon_v2_pokemonforms[0]
                        .pokemon_v2_pokemonformnames[0]?.name ||
                      nameByLang[language].name,
                    source: formImg(pokemon.id, idx),
                  },
                ],
              },
            ];
          })
        : []),
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
        })
      ),
      {
        h2: "Pokédex entries",
      },
      ...pokemon_v2_pokemonspeciesflavortexts
        .filter((f) => f.pokemon_v2_version.pokemon_v2_versionnames.length)
        .map((flavor) => {
          return {
            p: `**${
              flavor.pokemon_v2_version.pokemon_v2_versionnames[0].name
            }:** ${flavor.flavor_text
              .split("\n")
              .join(" ")
              .split("")
              .join(" ")}`,
          };
        }),
    ];

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
              target={`https://bulbapedia.bulbagarden.net/wiki/${englishName}_(Pok%C3%A9mon)}`}
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
                    color={
                      typeColor[t.pokemon_v2_type.pokemon_v2_typenames[0].name]
                    }
                  />
                );
              })}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Abilities">
              {pokemon.pokemon_v2_pokemonabilities.map((t) => {
                return (
                  <Detail.Metadata.TagList.Item
                    key={t.pokemon_v2_ability.pokemon_v2_abilitynames[0].name}
                    text={t.pokemon_v2_ability.pokemon_v2_abilitynames[0].name}
                    color={t.is_hidden ? Color.Brown : Color.Blue}
                  />
                );
              })}
            </Detail.Metadata.TagList>
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
    />
  );
}
