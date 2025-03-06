import { List } from "@raycast/api";
import json2md from "json2md";
import { PokemonV2Pokemon } from "../types";
import { filterPokemonForms, getOfficialArtworkImg } from "../utils";
import PokemonMetadata from "./metadata/pokemon";
import WeaknessMetadata from "./metadata/weakness";

export default function PokemonForms(props: {
  id: number;
  name: string;
  pokemons: PokemonV2Pokemon[];
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
          form.pokemon_v2_pokemonforms[0].pokemon_v2_pokemonformnames[0]
            ?.pokemon_name ||
          form.pokemon_v2_pokemonforms[0].pokemon_v2_pokemonformnames[0]
            ?.name ||
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
                        title: name,
                        source: getOfficialArtworkImg(props.id, idx),
                      },
                    ],
                  },
                ])}
                metadata={
                  <List.Item.Detail.Metadata>
                    <PokemonMetadata pokemon={form} />
                    <List.Item.Detail.Metadata.Separator />
                    <WeaknessMetadata types={form.pokemon_v2_pokemontypes} />
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
