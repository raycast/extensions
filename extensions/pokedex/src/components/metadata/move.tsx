import { List } from "@raycast/api";
import { PokemonV2Move } from "../../types";
import { typeColor } from "../../utils";

export default function MoveMetadata(props: { move: PokemonV2Move }) {
  const { move } = props;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Type">
        <List.Item.Detail.Metadata.TagList.Item
          text={move.pokemon_v2_type.pokemon_v2_typenames[0].name}
          icon={`types/${move.pokemon_v2_type.name}.svg`}
          color={typeColor[move.pokemon_v2_type.name]}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label
        title="Category"
        text={
          move.pokemon_v2_movedamageclass.pokemon_v2_movedamageclassnames[0].name
            .charAt(0)
            .toUpperCase() +
          move.pokemon_v2_movedamageclass.pokemon_v2_movedamageclassnames[0].name.slice(
            1,
          )
        }
        icon={`moves/${move.pokemon_v2_movedamageclass.pokemon_v2_movedamageclassnames[0].name || "status"}.svg`}
      />
      <List.Item.Detail.Metadata.Label
        title="Power"
        text={move.power?.toString() || "-"}
      />
      <List.Item.Detail.Metadata.Label
        title="Accuracy"
        text={move.accuracy ? move.accuracy + "%" : "-"}
      />
      <List.Item.Detail.Metadata.Label
        title="PP"
        text={move.pp?.toString() || "-"}
      />
    </List.Item.Detail.Metadata>
  );
}
