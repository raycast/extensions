import { Color, Detail, List } from "@raycast/api";
import uniqBy from "lodash.uniqby";
import { PokemonV2Pokemon } from "../../types";
import { typeColor } from "../../utils";

export default function PokemonMetadata(props: {
  type?: string;
  pokemon: PokemonV2Pokemon;
}) {
  const { pokemon } = props;

  const Metadata =
    props.type === "detail" ? Detail.Metadata : List.Item.Detail.Metadata;

  const meta = [
    <Metadata.TagList key="type" title="Type">
      {pokemon.pokemon_v2_pokemontypes.map((t) => {
        return (
          <Metadata.TagList.Item
            key={t.pokemon_v2_type.pokemon_v2_typenames[0].name}
            text={t.pokemon_v2_type.pokemon_v2_typenames[0].name}
            color={typeColor[t.pokemon_v2_type.name]}
            icon={`types/${t.pokemon_v2_type.name}.svg`}
          />
        );
      })}
    </Metadata.TagList>,
    <Metadata.TagList key="abilities" title="Abilities">
      {uniqBy(
        pokemon.pokemon_v2_pokemonabilities,
        (a) => a.pokemon_v2_ability.pokemon_v2_abilitynames[0].name,
      ).map((t) => {
        return (
          <Metadata.TagList.Item
            key={t.pokemon_v2_ability.pokemon_v2_abilitynames[0].name}
            text={t.pokemon_v2_ability.pokemon_v2_abilitynames[0].name}
            color={t.is_hidden ? Color.SecondaryText : Color.PrimaryText}
          />
        );
      })}
    </Metadata.TagList>,
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
