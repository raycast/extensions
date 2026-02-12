import { Detail, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchTypes } from "../../api";
import { PokemonType } from "../../types";
import { calculateEffectiveness } from "../../utils";

export default function WeaknessMetadata(props: {
  type?: string;
  types: PokemonType[];
}) {
  const TagListComponent =
    props.type === "detail"
      ? Detail.Metadata.TagList
      : List.Item.Detail.Metadata.TagList;

  const { data: allTypes } = usePromise(fetchTypes);

  const { weak, resistant, immune } = calculateEffectiveness(
    props.types,
    allTypes || [],
  );

  const tagList = [];

  if (weak.length) {
    tagList.push(
      <TagListComponent title="Weak To" key="weak">
        {weak.map(({ text, color }, index) => (
          <TagListComponent.Item key={index} text={text} color={color} />
        ))}
      </TagListComponent>,
    );
  }

  if (immune.length) {
    tagList.push(
      <TagListComponent title="Immune To" key="immute">
        {immune.map(({ text, color }, index) => (
          <TagListComponent.Item key={index} text={text} color={color} />
        ))}
      </TagListComponent>,
    );
  }

  if (resistant.length) {
    tagList.push(
      <TagListComponent title="Resistant To" key="resistant">
        {resistant.map(({ text, color }, index) => (
          <TagListComponent.Item key={index} text={text} color={color} />
        ))}
      </TagListComponent>,
    );
  }

  return tagList;
}
