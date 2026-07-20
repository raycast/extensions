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
      <TagListComponent title="Weaknesses" key="weak">
        {weak.map((props, index) => (
          <TagListComponent.Item key={index} {...props} />
        ))}
      </TagListComponent>,
    );
  }

  if (immune.length) {
    tagList.push(
      <TagListComponent title="Immunities" key="immute">
        {immune.map((props, index) => (
          <TagListComponent.Item key={index} {...props} />
        ))}
      </TagListComponent>,
    );
  }

  if (resistant.length) {
    tagList.push(
      <TagListComponent title="Resistances" key="resistant">
        {resistant.map((props, index) => (
          <TagListComponent.Item key={index} {...props} />
        ))}
      </TagListComponent>,
    );
  }

  return tagList;
}
