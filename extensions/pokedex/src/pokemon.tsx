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

import pokemons from "./statics/pokemons.json";

const preference = getPreferenceValues();

const types = [
  "Normal",
  "Fighting",
  "Flying",
  "Poison",
  "Psychic",
  "Ground",
  "Rock",
  "Bug",
  "Ghost",
  "Steel",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Dragon",
  "Dark",
  "Fairy",
];

function TypeDropdown(props: {
  onSelectType: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <List.Dropdown tooltip="Select Pokémon type" onChange={props.onSelectType}>
      <List.Dropdown.Item
        key="all"
        value="all"
        title="All Pokémon types"
        icon="icon.png"
      />
      {types.map((type) => {
        return (
          <List.Dropdown.Item
            key={type}
            value={type}
            title={type}
            icon={`types/${type}.png`}
          />
        );
      })}
    </List.Dropdown>
  );
}

export default function SearchPokemon() {
  const [nameOrId, setNameOrId] = useState<string>("");
  const [type, setType] = useState<string>("");
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
      searchBarAccessory={<TypeDropdown onSelectType={setType} />}
      isShowingDetail={showPreview}
    >
      {!nameOrId && (
        <List.Section>
          <List.Item
            key="surprise"
            title="Surprise Me!"
            accessoryTitle={showPreview ? undefined : "Random Pokémon selector"}
            icon="icon_random.png"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Surprise Me!"
                  icon="icon_random.png"
                  target={<PokemonDetail />}
                />
              </ActionPanel>
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
            {pokemonList.map((pokemon) => (
              <List.Item
                key={pokemon.id}
                title={`#${pokemon.id.toString().padStart(3, "0")}`}
                subtitle={pokemon.name}
                accessoryTitle={
                  showPreview ? undefined : pokemon.types.join(", ")
                }
                accessoryIcon={
                  showPreview ? undefined : `types/${pokemon.types[0]}.png`
                }
                detail={
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
                }
                icon={
                  showPreview
                    ? undefined
                    : {
                        source: pokemon.artwork,
                        fallback: "icon.png",
                      }
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      icon="icon_random.png"
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
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
