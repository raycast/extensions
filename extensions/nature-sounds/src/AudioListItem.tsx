import { List, Icon } from "@raycast/api";
import { Audio, Item, PlayingItem } from "./types";
import Actions from "./Actions";

export function AudioListItem(props: {
  item: Audio;
  index: number;
  playing: Item[];
  setPlaying: PlayingItem["setPlaying"];
}) {
  return (
    <>
      <List.Item
        icon={props.item.icon}
        title={props.item.name ?? "No title"}
        subtitle={props.item.subtitle ?? ""}
        accessories={[
          {
            icon:
              props.item.filename !== "stop"
                ? props.playing && props.playing.some((item) => item.name === props.item.filename)
                  ? Icon.Checkmark
                  : ""
                : "",
          },
        ]}
        actions={<Actions item={props.item} playing={props.playing ?? []} setPlaying={props.setPlaying} />}
      />
    </>
  );
}
