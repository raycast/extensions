import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import json2md from "json2md";
import { getPokemon } from "../api";
import { PokemonV2Pokemon, PokemonV2Pokemonspeciesname } from "../types";

const { language } = getPreferenceValues();

type SpeciesNameByLanguage = {
  [lang: string]: PokemonV2Pokemonspeciesname;
};

const GrowthRate: { [id: string]: string } = {
  "1": "Slow",
  "2": "Medium",
  "3": "Fast",
  "4": "Medium Slow",
  "5": "Erratic",
  "6": "Fluctuating",
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
    getPokemon(props.id || random(1, 898), Number(language))
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

  const dataObject: json2md.DataObject = useMemo(() => {
    if (!pokemon) return [];

    const {
      pokemon_v2_pokemonabilities,
      pokemon_v2_pokemonspecy,
      pokemon_v2_pokemontypes,
      pokemon_v2_pokemonstats,
    } = pokemon;

    const {
      pokemon_v2_evolutionchain,
      pokemon_v2_pokemonegggroups,
      pokemon_v2_pokemonspeciesflavortexts,
    } = pokemon_v2_pokemonspecy;

    const pkmNumber = pokemon.id.toString().padStart(3, "0");

    // excluding forms that unavailable in pokemon.com
    let forms = pokemon_v2_pokemonspecy.pokemon_v2_pokemons;
    switch (pokemon.id) {
      case 25: {
        const formNames = ["pikachu", "pikachu-gmax"];
        forms = forms.filter((f) => formNames.includes(f.name));
        break;
      }
      case 774: {
        const formNames = ["minior-red-meteor", "minior-red"];
        forms = forms.filter((f) => formNames.includes(f.name));
        break;
      }
      default:
        break;
    }

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
        h2: "Pokédex data",
      },
      {
        p:
          "_Type:_ " +
          pokemon_v2_pokemontypes
            .map((n) => n.pokemon_v2_type.pokemon_v2_typenames[0].name)
            .join(", "),
      },
      { p: `_Height:_ ${pokemon.height / 10}m` },
      { p: `_Weight:_ ${pokemon.weight / 10}kg` },
      {
        p: `_Abilities:_ ${pokemon_v2_pokemonabilities
          .map((a) => {
            if (a.is_hidden) {
              return `${a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name} (hidden)`;
            }

            return a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name;
          })
          .join(", ")}`,
      },
      {
        h2: "Base stats",
      },
      ...pokemon_v2_pokemonstats.map((n) => {
        return {
          p: `_${n.pokemon_v2_stat.pokemon_v2_statnames[0].name}_: ${n.base_stat}`,
        };
      }),
      {
        p: `Total: **${pokemon_v2_pokemonstats.reduce(
          (prev, cur) => prev + cur.base_stat,
          0
        )}**`,
      },
      {
        h2: "Training",
      },
      // {
      //   p: `_EV yield:_ `
      // },
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
      // {
      //   p: `_Gender:_ `
      // },
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
      {
        p: pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies
          .map((specy) => {
            return `![${
              specy.pokemon_v2_pokemonspeciesnames[0].name
            }](https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${specy.id
              .toString()
              .padStart(3, "0")}.png)`;
          })
          .join(" "),
      },
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

  const englishName = () => {
    // 9 is language_id for English
    return nameByLang["9"].name.replace(/ /g, "_");
  };

  return (
    <Detail
      isLoading={loading}
      navigationTitle={
        pokemon ? `${nameByLang[language].name} | Pokédex` : "Pokédex"
      }
      markdown={json2md(dataObject)}
      actions={
        pokemon && (
          <ActionPanel>
            <ActionPanel.Section title="Pokémon">
              <Action.OpenInBrowser
                title="Open in the Official Pokémon Website"
                icon="pokemon.ico"
                url={`https://www.pokemon.com/us/pokedex/${pokemon.pokemon_v2_pokemonspecy.name}`}
              />
              <Action.OpenInBrowser
                title="Open in Bulbapedia"
                icon="bulbapedia.ico"
                url={`https://bulbapedia.bulbagarden.net/wiki/${englishName()}_(Pok%C3%A9mon)`}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
