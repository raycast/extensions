import { List } from "@raycast/api";
import { PokemonMove } from "../../types";

export default function MoveMetadata(props: { move: PokemonMove["move"] }) {
  const { move } = props;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Type"
        text={move.type.typenames[0].name}
        icon={`types/${move.type.name}.svg`}
      />
      <List.Item.Detail.Metadata.Label
        title="Category"
        // text={
        //   move.movedamageclass.movedamageclassnames[0]?.name || move.movedamageclass.name
        // }
        // NOTE: PokeAPI GraphQL is returning an incorrect damage class name here,
        // so we ignore movedamageclassnames[0]?.name and just normalize `movedamageclass.name` instead.
        text={
          move.movedamageclass.name.charAt(0).toUpperCase() +
          move.movedamageclass.name.slice(1)
        }
        icon={{
          source: `moves/${move.movedamageclass.name || "status"}.svg`,
        }}
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
