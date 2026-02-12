import { Detail, List } from "@raycast/api";
import { PokemonType } from "../../types";
import { typeColor } from "../../utils";

export default function TypeMetadata(props: {
  types: PokemonType[];
  type?: string;
}) {
  const TagListComponent =
    props.type === "detail"
      ? Detail.Metadata.TagList
      : List.Item.Detail.Metadata.TagList;

  return (
    <Detail.Metadata.TagList key="type" title="Type">
      {props.types.map((type) => {
        return (
          <TagListComponent.Item
            key={type.type.name}
            text={type.type.typenames[0].name}
            color={typeColor[type.type.name]}
            icon={`types/${type.type.name.toLowerCase()}.svg`}
          />
        );
      })}
    </Detail.Metadata.TagList>
  );
}
