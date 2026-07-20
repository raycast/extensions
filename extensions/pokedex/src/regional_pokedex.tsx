import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useEffect, useState } from "react";
import { fetchPokedexes, fetchPokedexPokemon } from "./api";
import Pokemon from "./components/pokemon";
import { getLocalizedName, getPokemonImage } from "./utils";
import { PokemonDex } from "./types";

export default function RegionalPokedex(props: {
  arguments: { search?: string };
}) {
  const { search } = props.arguments;
  const [selectedPokedex, setSelectedPokedex] = useState<number | null>(null);
  const [pokemonList, setPokemonList] = useState<PokemonDex[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: pokedexes = [], isLoading: pokedexesLoading } =
    usePromise(fetchPokedexes);

  useEffect(() => {
    if (selectedPokedex) {
      setIsLoading(true);
      (async () => {
        try {
          const pokemon = await fetchPokedexPokemon(selectedPokedex);
          setPokemonList(pokemon || []);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [selectedPokedex]);

  const filteredPokemon = search
    ? pokemonList.filter(
        (p) =>
          p.pokemonspecy.name.toLowerCase().includes(search.toLowerCase()) ||
          p.pokedex_number.toString() === search,
      )
    : pokemonList;

  // Group Pokédexes by version group for dropdown
  const groupedPokedexes = groupBy(
    pokedexes,
    (p) =>
      p.pokedexversiongroups[0]?.versiongroup.versions
        .map((v) => getLocalizedName(v.versionnames, v.name))
        .join(" & ") || "Other",
  );

  return (
    <Grid
      throttle
      columns={6}
      searchBarPlaceholder="Search for Pokémon by name or number"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Regional Pokédex"
          value={selectedPokedex?.toString() || ""}
          onChange={(value) => {
            setSelectedPokedex(value ? parseInt(value) : null);
            setPokemonList([]);
          }}
          isLoading={pokedexesLoading}
        >
          {Object.entries(groupedPokedexes).map(([versionGroup, items]) => (
            <Grid.Dropdown.Section title={versionGroup} key={versionGroup}>
              {items.map((pokedex) => (
                <Grid.Dropdown.Item
                  key={pokedex.id}
                  title={getLocalizedName(pokedex.pokedexnames, pokedex.name)}
                  value={pokedex.id.toString()}
                />
              ))}
            </Grid.Dropdown.Section>
          ))}
        </Grid.Dropdown>
      }
      isLoading={isLoading}
    >
      {filteredPokemon.length > 0 ? (
        filteredPokemon.map((entry) => {
          const pokemonName = getLocalizedName(
            entry.pokemonspecy.pokemonspeciesnames,
            entry.pokemonspecy.name,
          );

          return (
            <Grid.Item
              key={`${entry.pokemon_species_id}-${entry.pokedex_number}`}
              content={getPokemonImage(entry.pokemon_species_id)}
              title={pokemonName}
              subtitle={`#${entry.pokedex_number.toString().padStart(3, "0")}`}
              keywords={[entry.pokemon_species_id.toString(), pokemonName]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Pokémon Profile"
                    icon={Icon.Sidebar}
                    target={<Pokemon id={entry.pokemon_species_id} />}
                  />
                </ActionPanel>
              }
            />
          );
        })
      ) : selectedPokedex ? (
        <Grid.EmptyView icon={Icon.MagnifyingGlass} title="No Pokémon Found" />
      ) : (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Select a Regional Pokédex"
          description="Choose a region from the dropdown to view Pokémon"
        />
      )}
    </Grid>
  );
}
