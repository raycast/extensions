import { Color, Detail, List } from "@raycast/api";
import json2md from "json2md";
import uniqBy from "lodash.uniqby";
import {
  PokemonV2PokemonspecyPokemonV2Pokemon,
  PokemonV2Pokemontype,
} from "../types";
import { typeColor } from "../utils";
import WeaknessesTagList from "./weakness_tag";

export default function PokemonForms(props: {
  id: number;
  name: string;
  pokemons: PokemonV2PokemonspecyPokemonV2Pokemon[];
}) {
  const formImg = (id: number, formId: number) => {
    const name = formId
      ? `${id.toString().padStart(3, "0")}_f${formId + 1}`
      : id.toString().padStart(3, "0");
    return `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${name}.png`;
  };

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

  const forms: {
    name: string;
    img: string;
    abilities: Detail.Metadata.TagList.Item.Props[];
    types: PokemonV2Pokemontype[];
  }[] = [];

  pokemons.forEach((p, pIdx) => {
    let pokemonForms = p.pokemon_v2_pokemonforms;
    if (varieties.length) {
      pokemonForms = pokemonForms.filter((f) =>
        varieties.includes(f.form_name),
      );
    }
    pokemonForms.forEach((f, fIdx) => {
      forms.push({
        name: f.pokemon_v2_pokemonformnames[0]?.name || props.name,
        img: formImg(props.id, pIdx + fIdx),
        types: p.pokemon_v2_pokemontypes,
        abilities: uniqBy(
          p.pokemon_v2_pokemonabilities,
          (a) => a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name,
        ).map((a) => ({
          text: a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name,
          color: a.is_hidden ? Color.SecondaryText : Color.PrimaryText,
        })),
      });
    });
  });

  return (
    <List
      throttle
      navigationTitle={`${props.name} | Forms`}
      isShowingDetail={true}
    >
      {forms.map((form) => {
        return (
          <List.Item
            key={form.name}
            title={form.name}
            detail={
              <List.Item.Detail
                markdown={json2md([
                  {
                    img: [
                      {
                        title: form.name,
                        source: form.img,
                      },
                    ],
                  },
                ])}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Type">
                      {form.types.map((type) => {
                        const typename =
                          type.pokemon_v2_type.pokemon_v2_typenames[0].name;
                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={typename}
                            text={typename}
                            color={typeColor[type.pokemon_v2_type.name]}
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Abilities">
                      {form.abilities.map((ability) => {
                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={ability.text}
                            text={ability.text}
                            color={ability.color}
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />

                    <WeaknessesTagList types={form.types} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={form.types.map((type) => ({
              icon: `types/${type.pokemon_v2_type.name}.svg`,
            }))}
          />
        );
      })}
    </List>
  );
}
