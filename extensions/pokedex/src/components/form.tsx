import { Color, List } from "@raycast/api";
import json2md from "json2md";
import uniqBy from "lodash.uniqby";
import { PokemonV2PokemonspecyPokemonV2Pokemon } from "../types";
import { calculateEffectiveness, typeColor } from "../utils";

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
    types: string[];
    img: string;
    abilities: { name: string; is_hidden: boolean }[];
    effectiveness: {
      normal: string[];
      weak: string[];
      immune: string[];
      resistant: string[];
    };
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
        types: p.pokemon_v2_pokemontypes.map(
          (n) => n.pokemon_v2_type.pokemon_v2_typenames[0].name,
        ),
        img: formImg(props.id, pIdx + fIdx),
        abilities: p.pokemon_v2_pokemonabilities.map((a) => ({
          name: a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name,
          is_hidden: a.is_hidden,
        })),
        effectiveness: calculateEffectiveness(p.pokemon_v2_pokemontypes),
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
        const { effectiveness } = form;
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
                      {form.types.map((type) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={type}
                          text={type}
                          color={typeColor[type.toLowerCase()]}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Abilities">
                      {uniqBy(form.abilities, (a) => a.name).map((a) => {
                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={a.name}
                            text={a.name}
                            color={
                              a.is_hidden
                                ? Color.SecondaryText
                                : Color.PrimaryText
                            }
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    {effectiveness.weak.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Weak to">
                        {effectiveness.weak.map((weakness, index) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={index}
                            text={weakness}
                            color={
                              typeColor[weakness.split(" ")[1].toLowerCase()]
                            }
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {effectiveness.resistant.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Resistant to">
                        {effectiveness.resistant.map((resistance, index) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={index}
                            text={resistance}
                            color={
                              typeColor[resistance.split(" ")[1].toLowerCase()]
                            }
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {effectiveness.immune.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Immune to">
                        {effectiveness.immune.map((immunity, index) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={index}
                            text={immunity}
                            color={typeColor[immunity.toLowerCase()]}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
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
