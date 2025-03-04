import { Detail, List } from "@raycast/api";
import { PokemonV2Pokemontype } from "../../types";
import { calculateEffectiveness } from "../../utils";

export default function WeaknessMetadata(props: {
  type?: string;
  types: PokemonV2Pokemontype[];
}) {
  const TagListComponent =
    props.type === "detail"
      ? Detail.Metadata.TagList
      : List.Item.Detail.Metadata.TagList;

  const { weak, resistant, immune } = calculateEffectiveness(props.types);

  const tagList = [];

  if (weak.length) {
    tagList.push(
      <TagListComponent title="Weak to" key="weak">
        {weak.map(({ text, color }, index) => (
          <TagListComponent.Item key={index} text={text} color={color} />
        ))}
      </TagListComponent>,
    );
  }

  if (immune.length) {
    tagList.push(
      <TagListComponent title="Immune to" key="immute">
        {immune.map(({ text, color }, index) => (
          <TagListComponent.Item key={index} text={text} color={color} />
        ))}
      </TagListComponent>,
    );
  }

  if (resistant.length) {
    tagList.push(
      <TagListComponent title="Resistant to" key="resistant">
        {resistant.map(({ text, color }, index) => (
          <TagListComponent.Item key={index} text={text} color={color} />
        ))}
      </TagListComponent>,
    );
  }

  return tagList;
}
