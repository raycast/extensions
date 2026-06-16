import { Detail, List } from "@raycast/api";
import { PokemonType } from "../../types";
import { getLocalizedName, typeColor } from "../../utils";

export default function TypeMetadata(props: {
  types: PokemonType[];
  type?: string;
}) {
  const TagListComponent =
    props.type === "detail"
      ? Detail.Metadata.TagList
      : List.Item.Detail.Metadata.TagList;

  return (
    <TagListComponent key="type" title="Type">
      {props.types.map((type) => {
        return (
          <TagListComponent.Item
            key={type.type.name}
            text={getLocalizedName(type.type.typenames, type.type.name)}
            color={typeColor[type.type.name]}
            icon={`types/${type.type.name.toLowerCase()}.svg`}
          />
        );
      })}
    </TagListComponent>
  );
}
