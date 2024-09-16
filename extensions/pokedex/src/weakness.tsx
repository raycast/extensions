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
import { getPokemon } from "./api";
import PokemonDetail from "./components/detail";
import TypeDropdown from "./components/type_dropdown";
import pokedex from "./statics/pokedex.json";
import { PokemonV2Pokemon } from "./types";
import { calculateEffectiveness, typeColor } from "./utils";

const { language } = getPreferenceValues();

export default function PokemonWeaknesses() {
  const [pokemon, setPokemon] = useState<PokemonV2Pokemon | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>("all");

  const [effectiveness, setEffectiveness] = useState<{
    normal: string[];
    weak: string[];
    immune: string[];
    resistant: string[];
  }>({ normal: [], weak: [], immune: [], resistant: [] });

  const [selectedPokemonId, setSelectedPokemonId] = useState(1);
  const [pokemonName, setPokemonName] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    getPokemon(selectedPokemonId, Number(language))
      .then((data) => {
        const fetchedPokemon = data[0];
        setPokemon(fetchedPokemon);
        setPokemonName(
          fetchedPokemon.name.charAt(0).toUpperCase() +
            fetchedPokemon.name.slice(1),
        );
        const typeEffectiveness = calculateEffectiveness(
          fetchedPokemon.pokemon_v2_pokemontypes,
        );
        setEffectiveness(typeEffectiveness);
        setLoading(false);
      })
      .catch(() => {
        setPokemon(undefined);
        setLoading(false);
      });
  }, [selectedPokemonId]);

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
                subtitle={poke.name}
                keywords={[poke.id.toString(), poke.name]}
                accessories={poke.types.map((type) => ({
                  icon: `types/${type.toLowerCase()}.svg`,
                  tooltip: type,
                }))}
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
                              source: `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${pokemon?.id.toString().padStart(3, "0")}.png`,
                            },
                          ],
                        },
                      ])}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {effectiveness.weak.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Weak to">
                              {effectiveness.weak.map((weakness, index) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={index}
                                  text={weakness}
                                  color={
                                    typeColor[
                                      weakness.split(" ")[1].toLowerCase()
                                    ]
                                  }
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {effectiveness.resistant.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Resistant to">
                              {effectiveness.resistant.map(
                                (resistance, index) => (
                                  <List.Item.Detail.Metadata.TagList.Item
                                    key={index}
                                    text={resistance}
                                    color={
                                      typeColor[
                                        resistance.split(" ")[1].toLowerCase()
                                      ]
                                    }
                                  />
                                ),
                              )}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {effectiveness.immune.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Immune to">
                              {effectiveness.immune.map((immunity, index) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={index}
                                  text={immunity}
                                  color={typeColor[immunity.toLowerCase()]}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  )
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Pokémon Details"
                      icon={Icon.Sidebar}
                      target={<PokemonDetail id={poke.id} />}
                    />
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
      }
    }, 300),
    [],
  );

  const onSelectionChange = (index: string | null) => {
    setLoading(true);
    debouncedSelectionChange(index);
  };

  return (
    <List
      throttle
      searchBarPlaceholder="Search for Pokémon by name or Pokédex number"
      searchBarAccessory={
        <TypeDropdown type="grid" command="Pokémon" onSelectType={setType} />
      }
      navigationTitle={`${loading ? "" : pokemonName + " | "}Weaknesses`}
      isShowingDetail={true}
      isLoading={loading}
      selectedItemId={String(selectedPokemonId)}
      onSelectionChange={onSelectionChange}
      children={displayWeaknesses}
    />
  );
}
