import {
  Action,
  ActionPanel,
  List,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useMemo, useState } from "react";
import groupBy from "lodash.groupby";
import json2md from "json2md";
import PokemonDetail from "./components/detail";
import TypeDropdown from "./components/type_dropdown";

import pokemons from "./statics/pokemons.json";

const preference = getPreferenceValues();

export default function SearchPokemon() {
  const [nameOrId, setNameOrId] = useState<string>("");
  const [type, setType] = useState<string>("all");
  const [showPreview, setShowPreview] = useState<boolean>(
    preference.showPreview
  );

  const generations = useMemo(() => {
    let listing = nameOrId
      ? pokemons.filter(
          (p) =>
            p.name.toLowerCase().includes(nameOrId.toLowerCase()) ||
            p.id === Number(nameOrId)
        )
      : pokemons;

    if (type != "all") {
      listing = listing.filter((p) => p.types.includes(type));
    }

    return groupBy(listing, "generation");
  }, [nameOrId, type]);

  return (
    <List
      throttle
      onSearchTextChange={(text) => setNameOrId(text)}
      searchBarPlaceholder="Search Pokémon by name or number..."
      searchBarAccessory={
        <TypeDropdown command="Pokémon" onSelectType={setType} />
      }
      isShowingDetail={showPreview}
    >
      {!nameOrId && type === "all" && (
        <List.Section>
          <List.Item
            key="surprise"
            title="Surprise Me!"
            accessories={
              showPreview ? undefined : [{ text: "Random Pokémon selector" }]
            }
            icon="icon_sort.svg"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Surprise Me!"
                  icon="icon_sort.svg"
                  target={<PokemonDetail />}
                />
                <Action
                  title={showPreview ? "Hide Preview" : "Show Preview"}
                  icon={Icon.Sidebar}
                  onAction={() => setShowPreview(!showPreview)}
                />
              </ActionPanel>
            }
            detail={
              showPreview ? (
                <List.Item.Detail
                  markdown={json2md([
                    {
                      h1: "Surprise Me!",
                    },
                    {
                      p: `Show a random Pokémon details between the inclusive **${
                        pokemons[0].name
                      }** and **${pokemons.reverse()[0].name}** bounds`,
                    },
                  ])}
                />
              ) : undefined
            }
          />
        </List.Section>
      )}
      {Object.entries(generations).map(([generation, pokemonList]) => {
        return (
          <List.Section
            key={generation}
            title={generation}
            subtitle={pokemonList.length.toString()}
          >
            {pokemonList.map((pokemon) => {
              const props: Partial<List.Item.Props> = showPreview
                ? {
                    accessories: pokemon.types.map((type) => ({
                      icon: `types/${type.toLowerCase()}.svg`,
                    })),
                    detail: (
                      <List.Item.Detail
                        markdown={json2md([
                          {
                            h1: pokemon.name,
                          },
                          { p: pokemon.types.join(", ") },
                          {
                            img: {
                              title: pokemon.name,
                              source: pokemon.artwork,
                            },
                          },
                        ])}
                      />
                    ),
                  }
                : {
                    accessories: pokemon.types.map((type) => ({
                      text: type,
                      icon: `types/${type.toLowerCase()}.svg`,
                    })),
                    icon: {
                      source: pokemon.artwork,
                      fallback: "icon.png",
                    },
                  };

              return (
                <List.Item
                  key={pokemon.id}
                  title={`#${pokemon.id.toString().padStart(3, "0")}`}
                  subtitle={pokemon.name}
                  {...props}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Show Details"
                        icon="icon_sort.svg"
                        target={<PokemonDetail id={pokemon.id} />}
                      />
                      <Action
                        title={showPreview ? "Hide Preview" : "Show Preview"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowPreview(!showPreview)}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
