import { List } from "@raycast/api";
import json2md from "json2md";
import { Pokemon } from "../types";
import { filterPokemonForms, getOfficialArtworkImg } from "../utils";
import PokemonMetadata from "./metadata/pokemon";
import WeaknessMetadata from "./metadata/weakness";

export default function PokemonForms(props: {
  id: number;
  name: string;
  pokemons: Pokemon[];
}) {
  const forms = filterPokemonForms(props.id, props.pokemons);

  return (
    <List
      throttle
      navigationTitle={`${props.name} | Forms`}
      isShowingDetail={true}
    >
      {forms.map((form, idx) => {
        const name =
          form.pokemonforms[0].pokemonformnames[0]?.pokemon_name ||
          form.pokemonforms[0].pokemonformnames[0]?.name ||
          props.name;
        return (
          <List.Item
            key={idx}
            title={name}
            detail={
              <List.Item.Detail
                markdown={json2md([
                  {
                    img: [
                      {
                        title:
                          form.pokemonforms[0].pokemonformnames.find(
                            (n) => n.pokemon_name === form.name,
                          )?.name || form.pokemonforms[0].form_name,
                        source: getOfficialArtworkImg(props.id, idx),
                      },
                    ],
                  },
                ])}
                metadata={
                  <List.Item.Detail.Metadata>
                    <PokemonMetadata pokemon={form} />
                    <List.Item.Detail.Metadata.Separator />
                    <WeaknessMetadata types={form.pokemontypes} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
