import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import json2md from "json2md";
import debounce from "lodash.debounce";
import groupBy from "lodash.groupby";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPokemonWithCaching } from "./api";
import MetadataWeakness from "./components/metadata/weakness";
import PokeProfile from "./components/profile";
import TypeDropdown from "./components/type_dropdown";
import pokedex from "./statics/pokedex.json";
import { PokemonV2Pokemon, PokemonV2Pokemonspeciesname } from "./types";
import { getOfficialArtworkImg, localeName, typeColor } from "./utils";

const { language } = getPreferenceValues();

type SpeciesNameByLanguage = {
  [lang: string]: PokemonV2Pokemonspeciesname;
};

export default function PokeWeaknesses() {
  const [pokemon, setPokemon] = useState<PokemonV2Pokemon | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("all");

  const [selectedPokemonId, setSelectedPokemonId] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchPokemonWithCaching(selectedPokemonId, Number(language))
      .then((data) => {
        const fetchedPokemon = data[0];
        setPokemon(fetchedPokemon);
        setLoading(false);
      })
      .catch(() => {
        setPokemon(undefined);
        setLoading(false);
      });
  }, [selectedPokemonId]);

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

  const pokemons = useMemo(() => {
    return type != "all"
      ? pokedex.filter((p) => p.types.includes(type))
      : pokedex;
  }, [type]);

  const displayWeaknesses = Object.entries(groupBy(pokemons, "generation")).map(
    ([generation, pokemonList]) => {
      return (
        <List.Section title={generation} key={generation}>
          {pokemonList.map((poke) => {
            return (
              <List.Item
                key={poke.id}
                id={poke.id.toString()}
                title={`#${poke.id.toString().padStart(4, "0")}`}
                subtitle={localeName(poke, language)}
                keywords={[poke.id.toString(), poke.name]}
                detail={
                  loading ? (
                    ""
                  ) : (
                    <List.Item.Detail
                      markdown={json2md([
                        {
                          img: [
                            {
                              title: poke.name,
                              source: getOfficialArtworkImg(poke.id),
                            },
                          ],
                        },
                      ])}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Type">
                            {pokemon?.pokemon_v2_pokemontypes.map((type) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={type.pokemon_v2_type.name}
                                text={
                                  type.pokemon_v2_type.pokemon_v2_typenames[0]
                                    .name
                                }
                                icon={`types/${type.pokemon_v2_type.name}.svg`}
                                color={typeColor[type.pokemon_v2_type.name]}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>

                          <MetadataWeakness
                            types={pokemon?.pokemon_v2_pokemontypes || []}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  )
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Information">
                      <Action.Push
                        title="Pokémon Profile"
                        icon={Icon.Sidebar}
                        target={<PokeProfile id={poke.id} />}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      );
    },
  );

  const debouncedSelectionChange = useCallback(
    debounce((index: string | null) => {
      if (index) {
        setSelectedPokemonId(parseInt(index));
        if (pokemon) {
          setPokemon(undefined);
        }
      }
    }, 300),
    [],
  );

  const onSelectionChange = (index: string | null) => {
    debouncedSelectionChange(index);
  };

  return (
    <List
      throttle
      searchBarPlaceholder="Search for Pokémon by name or Pokédex number"
      searchBarAccessory={
        <TypeDropdown type="grid" command="Pokémon" onSelectType={setType} />
      }
      navigationTitle={
        pokemon ? `${nameByLang[language].name} | Weaknesses` : "Weaknesses"
      }
      isShowingDetail={true}
      isLoading={loading}
      selectedItemId={String(selectedPokemonId)}
      onSelectionChange={onSelectionChange}
      children={displayWeaknesses}
    />
  );
}
