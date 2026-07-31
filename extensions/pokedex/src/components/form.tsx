import { List } from "@raycast/api";
import json2md from "json2md";
import { Pokemon } from "../types";
import PokemonMetadata from "./metadata/pokemon";
import WeaknessMetadata from "./metadata/weakness";
import { getLocalizedName, getPokemonImageTag } from "../utils";
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
          getLocalizedName(form.pokemonforms[0].pokemonformnames, props.name);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pokemonformnames, pokemonformtypes, ...rest } =
          form.pokemonforms[0];
        const formTypes =
          pokemonformtypes.length > 0 ? pokemonformtypes : form.pokemontypes;

        const accessories: List.Item.Accessory[] = [];
        if (rest.is_mega) {
          accessories.push({ icon: "mega-evolution-sigil.png" });
        }

        if (rest.form_name.endsWith("gmax")) {
          accessories.push({ icon: "gigantamax-icon.png" });
        }

        return (
          <List.Item
            key={idx}
            title={name}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={json2md([
                  {
                    p: getPokemonImageTag(props.id, { idx, ...rest }),
                  },
                ])}
                metadata={
                  <List.Item.Detail.Metadata>
                    <PokemonMetadata
                      pokemon={form}
                      mega={rest.is_mega}
                      formtypes={formTypes}
                    />
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
