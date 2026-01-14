import { Detail, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchTypesWithCaching } from "../../api";
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

  const { data: allTypes } = usePromise(fetchTypesWithCaching);

  const { weak, resistant, immune } = calculateEffectiveness(
    props.types,
    allTypes || [],
  );

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
