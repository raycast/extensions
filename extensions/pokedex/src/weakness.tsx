import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import debounce from "lodash.debounce";
import groupBy from "lodash.groupby";
import { useCallback, useMemo, useState } from "react";
import { fetchPokemonWithCaching } from "./api";
import WeaknessMetadata from "./components/metadata/weakness";
import PokeProfile from "./components/profile";
import TypeDropdown from "./components/type_dropdown";
import pokedex from "./statics/pokedex.json";
import { PokemonSpeciesName } from "./types";
import {
  getOfficialArtworkImg,
  localeName,
  nationalDexNumber,
  typeColor,
} from "./utils";

const { language } = getPreferenceValues();

export default function PokeWeaknesses(props: {
  arguments: { search?: string };
}) {
  const { search } = props.arguments;
  const [type, setType] = useState<string>("all");

  const initialPokemon = useMemo(() => {
    if (!search) return 1;
    const found = pokedex.find(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toString() === search,
    );
    return found ? found.id : 1;
  }, [search]);

  const [selectedPokemonId, setSelectedPokemonId] = useState(initialPokemon);

  const { data: pokemon, isLoading } = usePromise(fetchPokemonWithCaching, [
    selectedPokemonId,
  ]);

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

  const pokemons = useMemo(() => {
    let filtered =
      type != "all" ? pokedex.filter((p) => p.types.includes(type)) : pokedex;

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toString() === search,
      );
    }
    return filtered;
  }, [type, search]);

  const displayWeaknesses = Object.entries(groupBy(pokemons, "generation")).map(
    ([generation, pokemonList]) => {
      return (
        <List.Section title={generation} key={generation}>
          {pokemonList.map((poke) => {
            return (
              <List.Item
                key={poke.id}
                id={poke.id.toString()}
                title={nationalDexNumber(poke.id)}
                subtitle={localeName(poke, language)}
                keywords={[poke.id.toString(), poke.name]}
                detail={
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
                      !isLoading &&
                      pokemon && (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Type">
                            {pokemon?.pokemontypes.map((type) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={type.type.name}
                                text={type.type.typenames[0].name}
                                icon={`types/${type.type.name}.svg`}
                                color={typeColor[type.type.name]}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>

                          <WeaknessMetadata
                            types={pokemon?.pokemontypes || []}
                          />
                        </List.Item.Detail.Metadata>
                      )
                    }
                  />
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
      isLoading={isLoading}
      selectedItemId={String(selectedPokemonId)}
      onSelectionChange={onSelectionChange}
      children={displayWeaknesses}
    />
  );
}
