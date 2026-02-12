import { Color, Detail, List } from "@raycast/api";
import { Pokemon } from "../../types";
import TypeMetadata from "./type";

export default function PokemonMetadata(props: {
  type?: string;
  pokemon: Pokemon;
}) {
  const { pokemon } = props;

  const Metadata =
    props.type === "detail" ? Detail.Metadata : List.Item.Detail.Metadata;

  const meta = [
    <TypeMetadata
      key="types"
      types={props.pokemon.pokemontypes}
      type="detail"
    />,

    <Detail.Metadata.TagList key="abilities" title="Abilities">
      {props.pokemon.pokemonabilities.map((ability) => {
        return (
          <Detail.Metadata.TagList.Item
            key={ability.ability.abilitynames[0].name}
            text={ability.ability.abilitynames[0].name}
            color={ability.is_hidden ? Color.SecondaryText : Color.PrimaryText}
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
