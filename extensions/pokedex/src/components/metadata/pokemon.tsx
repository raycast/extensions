import { Color, Detail, List } from "@raycast/api";
import { Pokemon } from "../../types";
import { typeColor } from "../../utils";

export default function PokemonMetadata(props: {
  type?: string;
  pokemon: Pokemon;
}) {
  const { pokemon } = props;

  const Metadata =
    props.type === "detail" ? Detail.Metadata : List.Item.Detail.Metadata;

  const meta = [
    <Detail.Metadata.TagList key="types" title="Types">
      {props.pokemon.pokemontypes.map((type) => {
        return (
          <Detail.Metadata.TagList.Item
            key={type.type.name}
            text={type.type.typenames[0].name}
            color={typeColor[type.type.name]}
          />
        );
      })}
    </Detail.Metadata.TagList>,
    <Detail.Metadata.TagList key="abilities" title="Abilities">
      {props.pokemon.pokemonabilities.map((ability) => {
        return (
          <Detail.Metadata.TagList.Item
            key={ability.ability.abilitynames[0].name}
            text={
              ability.is_hidden
                ? `${ability.ability.abilitynames[0].name} (Hidden)`
                : ability.ability.abilitynames[0].name
            }
            color={Color.PrimaryText}
          />
        );
      })}
    </Detail.Metadata.TagList>,
    <Metadata.Label
      key="height"
      title="Height"
      text={`${pokemon.height / 10}m`}
    />,
    <Metadata.Label
      key="weight"
      title="Weight"
      text={`${pokemon.weight / 10}kg`}
    />,
  ];

  return meta;
}
