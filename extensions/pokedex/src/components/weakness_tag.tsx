import { Detail, List } from "@raycast/api";
import { PokemonV2Pokemontype } from "../types";
import { calculateEffectiveness, typeColor } from "../utils";

export default function WeaknessesTagList(props: {
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
        {weak.map((weakness, index) => (
          <TagListComponent.Item
            key={index}
            text={weakness}
            color={typeColor[weakness.split(" ")[1].toLowerCase()]}
          />
        ))}
      </TagListComponent>,
    );
  }

  if (resistant.length) {
    tagList.push(
      <TagListComponent title="Resistant to" key="resistant">
        {resistant.map((resistance, index) => (
          <TagListComponent.Item
            key={index}
            text={resistance}
            color={typeColor[resistance.split(" ")[1].toLowerCase()]}
          />
        ))}
      </TagListComponent>,
    );
  }

  if (immune.length) {
    tagList.push(
      <TagListComponent title="Immune to" key="immute">
        {immune.map((immunity, index) => (
          <TagListComponent.Item
            key={index}
            text={immunity}
            color={typeColor[immunity.toLowerCase()]}
          />
        ))}
      </TagListComponent>,
    );
  }

  return tagList;
}
