import { Color, Detail, List } from "@raycast/api";
import { Pokemon, PokemonType } from "../../types";
import { getLocalizedName } from "../../utils";
import TypeMetadata from "./type";

export default function PokemonMetadata(props: {
  type?: string;
  pokemon: Pokemon;
  mega?: boolean;
  formtypes?: PokemonType[];
}) {
  const { pokemon, mega, formtypes } = props;

  const Metadata =
    props.type === "detail" ? Detail.Metadata : List.Item.Detail.Metadata;

  const meta = [
    <TypeMetadata
      key="types"
      types={formtypes || pokemon.pokemontypes}
      type="detail"
    />,
    !mega && (
      <Detail.Metadata.TagList key="abilities" title="Abilities">
        {pokemon.pokemonabilities.map((ability) => {
          const abilityName = getLocalizedName(
            ability.ability.abilitynames,
            ability.ability.name,
          );

          return (
            <Detail.Metadata.TagList.Item
              key={abilityName}
              text={abilityName}
              color={
                ability.is_hidden ? Color.SecondaryText : Color.PrimaryText
              }
            />
          );
        })}
      </Detail.Metadata.TagList>
    ),
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

  return meta.filter(Boolean);
}
