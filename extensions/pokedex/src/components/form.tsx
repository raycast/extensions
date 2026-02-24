import { List } from "@raycast/api";
import json2md from "json2md";
import { Pokemon } from "../types";
import PokemonMetadata from "./metadata/pokemon";
import WeaknessMetadata from "./metadata/weakness";
import { getMarkdownPokemonImage } from "../utils";
import { filterPokemonForms } from "../utils/form";

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

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pokemonformnames, pokemonformtypes, ...rest } =
          form.pokemonforms[0];
        const formTypes =
          pokemonformtypes.length > 0 ? pokemonformtypes : form.pokemontypes;

        return (
          <List.Item
            key={idx}
            title={name}
            detail={
              <List.Item.Detail
                markdown={json2md([
                  {
                    p: getMarkdownPokemonImage(props.id, { idx, ...rest }),
                  },
                ])}
                metadata={
                  <List.Item.Detail.Metadata>
                    <PokemonMetadata pokemon={form} formtypes={formTypes} />
                    <List.Item.Detail.Metadata.Separator />
                    <WeaknessMetadata types={formTypes} />
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
