import { ActionPanel, Action, Toast, showToast } from "@raycast/api";
import { Audio, Item, PlayingItem } from "./types";
import { exec } from "child_process";

export default function Actions(props: { item: Audio; playing: Item[]; setPlaying: PlayingItem["setPlaying"] }) {
  return (
    <ActionPanel title={props.item.name}>
      <ActionPanel.Section>
        {props.item.filename === "stop" && (
          <Action
            title="Stop All Sounds"
            onAction={() => {
              exec(`killall afplay`);
              props.setPlaying([]);
              showToast({
                style: Toast.Style.Success,
                title: `${props.item.icon} Stopped all sounds`,
              });
            }}
          />
        )}

        {props.playing &&
          props.item.filename !== "stop" &&
          !props.playing.some((item: Item) => item.name === props.item.filename) && (
            <Action
              title="Play"
              onAction={() => {
                const played = exec(`afplay ${__dirname}/assets/${props.item.filename}.mp3 && $$`);
                const tempState: Item[] = [...props.playing, { name: props.item.filename, pid: played.pid! }];
                props.setPlaying(tempState);
                showToast({
                  style: Toast.Style.Success,
                  title: `Now playing — ${props.item.icon} ${props.item.name}`,
                });
              }}
            />
          )}

        {props.playing &&
          props.item.filename !== "stop" &&
          props.playing.some((item: Item) => item.name === props.item.filename) && (
            <Action
              title="Stop"
              onAction={() => {
                const pidToKill = props.playing.filter((item) => item.name === props.item.filename);
                exec(`kill -9 ${pidToKill[0]["pid"] + 1}`);
                props.setPlaying((prevState: Item[]) => prevState.filter((item) => item.name !== props.item.filename));
                showToast({
                  style: Toast.Style.Success,
                  title: `Stopped the ${props.item.icon} ${props.item.name}`,
                });
              }}
            />
          )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
