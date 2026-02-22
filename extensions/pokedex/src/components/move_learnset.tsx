import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import uniqBy from "lodash.uniqby";
import { PokemonMove } from "../types";
import { getPokemonImage, nationalDexNumber } from "../utils";
import PokeProfile from "./profile";
import { filterPokemonForms } from "../utils/form";

export default function MoveLearnset(props: {
  name: string;
  moves: PokemonMove[];
}) {
  const learnset = groupBy(
    props.moves,
    (m) => m.movelearnmethod.movelearnmethodnames[0].name,
  );

  return (
    <Grid throttle columns={6} navigationTitle={`${props.name} | Learnset`}>
      {Object.entries(learnset).map(([method, moves]) => {
        const filteredMoves = moves
          .map((move) => {
            // removes Pokemon forms without official images on pokemon.com
            move.pokemon.pokemonspecy.pokemons = filterPokemonForms(
              move.pokemon.pokemon_species_id,
              move.pokemon.pokemonspecy.pokemons,
            );

            return move;
          })
          .filter((move) => {
            const formIdx = move.pokemon.pokemonspecy.pokemons.findIndex(
              (p) => p.pokemonforms[0].pokemon_id === move.pokemon_id,
            );

            return formIdx > -1;
          });

        const orderedMoves = orderBy(
          // not sure why some pokemon_id is duplicated here
          uniqBy(filteredMoves, "pokemon_id"),
          (p) => p.pokemon.pokemon_species_id,
        );

        return (
          <Grid.Section title={method} key={method}>
            {orderedMoves.map((move) => {
              const nationalDex = move.pokemon.pokemon_species_id;
              const forms = move.pokemon.pokemonspecy.pokemons;

              const form = forms.find(
                (f) => f.pokemonforms[0].pokemon_id === move.pokemon_id,
              );
              const formIdx = forms.findIndex(
                (f) => f.pokemonforms[0].pokemon_id === move.pokemon_id,
              );

              const title =
                form?.pokemonforms[0].pokemonformnames[0]?.pokemon_name ||
                move.pokemon.pokemonspecy.pokemonspeciesnames[0].name;

              return (
                <Grid.Item
                  key={move.pokemon_id}
                  content={getPokemonImage(move.pokemon.pokemon_species_id, {
                    idx: formIdx,
                    pokemon_id: move.pokemon_id,
                  })}
                  title={title}
                  subtitle={nationalDexNumber(nationalDex)}
                  keywords={[title, nationalDex.toString()]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Information">
                        <Action.Push
                          title="Pokémon Profile"
                          icon={Icon.Sidebar}
                          target={<PokeProfile id={nationalDex} />}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}
