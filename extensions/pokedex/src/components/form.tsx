import { List } from "@raycast/api";
import json2md from "json2md";
import { PokemonV2Pokemon } from "../types";
import { getOfficialArtworkImg } from "../utils";
import MetadataPokemon from "./metadata/pokemon";
import MetadataWeakness from "./metadata/weakness";

export default function PokemonForms(props: {
  id: number;
  name: string;
  pokemons: PokemonV2Pokemon[];
}) {
  // excluding forms that unavailable in pokemon.com
  let pokemons = props.pokemons;
  let formNames: string[] = [];
  let varieties: string[] = [];
  switch (props.id) {
    case 25:
      formNames = ["pikachu", "pikachu-gmax"];
      break;
    case 555:
      formNames = ["darmanitan-standard", "darmanitan-galar-standard"];
      break;
    case 666:
      varieties = [
        "meadow",
        "continental",
        "garden",
        "elegant",
        "marine",
        "high-plains",
        "river",
      ];
      break;
    // case 668:
    //   // male, female
    //   break
    case 670:
      formNames = ["floette"];
      varieties = ["red"];
      break;
    case 671:
      varieties = ["red"];
      break;
    case 676:
      varieties = ["natural", "heart", "star", "diamond"];
      break;
    case 744:
      formNames = ["rockruff"];
      break;
    case 774:
      formNames = ["minior-red-meteor", "minior-red"];
      break;
    case 778:
      formNames = ["mimikyu-disguised"];
      break;
    case 849:
      formNames = [
        "toxtricity-amped",
        "toxtricity-low-key",
        "toxtricity-amped-gmax",
      ];
      break;
    case 875:
      // eiscue-noice available in Zukan, but not in pokemon.com at the moment
      formNames = ["eiscue-ice"];
      break;
    default:
      break;
  }

  if (formNames.length) {
    pokemons = pokemons.filter((p) => formNames.includes(p.name));
  }

  const forms: PokemonV2Pokemon[] = [];

  pokemons.forEach((p) => {
    if (varieties.length) {
      varieties.forEach((variety) => {
        const pokemonforms = p.pokemon_v2_pokemonforms.filter(
          (f) => f.form_name === variety,
        );

        forms.push({
          ...p,
          pokemon_v2_pokemonforms: pokemonforms,
        });
      });
    } else {
      forms.push(p);
    }
  });

  return (
    <List
      throttle
      navigationTitle={`${props.name} | Forms`}
      isShowingDetail={true}
    >
      {forms.map((form, idx) => {
        const name =
          form.pokemon_v2_pokemonforms[0].pokemon_v2_pokemonformnames[0]
            ?.name || props.name;
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
                    <MetadataPokemon pokemon={form} />
                    <List.Item.Detail.Metadata.Separator />
                    <MetadataWeakness types={form.pokemon_v2_pokemontypes} />
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
