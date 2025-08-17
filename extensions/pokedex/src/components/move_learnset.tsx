import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Grid,
  Icon,
} from "@raycast/api";
import groupBy from "lodash.groupby";
import orderBy from "lodash.orderby";
import uniqBy from "lodash.uniqby";
import { PokemonV2Move } from "../types";
import { filterPokemonForms, getContentImg, nationalDexNumber } from "../utils";
import PokeProfile from "./profile";

const { artwork } = getPreferenceValues();

export default function MoveLearnset(props: {
  name: string;
  moves: PokemonV2Move[];
}) {
  const learnset = groupBy(
    props.moves,
    (m) => m.pokemon_v2_movelearnmethod.pokemon_v2_movelearnmethodnames[0].name,
  );

  return (
    <Grid throttle columns={6} navigationTitle={`${props.name} | Learnset`}>
      {Object.entries(learnset).map(([method, moves]) => {
        const filteredMoves = moves
          .map((move) => {
            // removes Pokemon forms without official images on pokemon.com
            move.pokemon_v2_pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemons =
              filterPokemonForms(
                move.pokemon_v2_pokemon.pokemon_species_id,
                move.pokemon_v2_pokemon.pokemon_v2_pokemonspecy
                  .pokemon_v2_pokemons,
              );

            return move;
          })
          .filter((move) => {
            const formIdx =
              move.pokemon_v2_pokemon.pokemon_v2_pokemonspecy.pokemon_v2_pokemons.findIndex(
                (p) =>
                  p.pokemon_v2_pokemonforms[0].pokemon_id === move.pokemon_id,
              );

            return formIdx > -1;
          });

        const orderedMoves = orderBy(
          // not sure why some pokemon_id is duplicated here
          uniqBy(filteredMoves, "pokemon_id"),
          (p) => p.pokemon_v2_pokemon.pokemon_species_id,
        );

        return (
          <Grid.Section title={method} key={method}>
            {orderedMoves.map((move) => {
              const nationalDex = move.pokemon_v2_pokemon.pokemon_species_id;
              const forms =
                move.pokemon_v2_pokemon.pokemon_v2_pokemonspecy
                  .pokemon_v2_pokemons;

              const form = forms.find(
                (f) =>
                  f.pokemon_v2_pokemonforms[0].pokemon_id === move.pokemon_id,
              );
              const formIdx = forms.findIndex(
                (f) =>
                  f.pokemon_v2_pokemonforms[0].pokemon_id === move.pokemon_id,
              );
              const pokeId =
                artwork === "pixel" ? move.pokemon_id : nationalDex;

              const title =
                form?.pokemon_v2_pokemonforms[0].pokemon_v2_pokemonformnames[0]
                  ?.pokemon_name ||
                move.pokemon_v2_pokemon.pokemon_v2_pokemonspecy
                  .pokemon_v2_pokemonspeciesnames[0].name;

              return (
                <Grid.Item
                  key={move.pokemon_id}
                  content={getContentImg(pokeId, formIdx)}
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
