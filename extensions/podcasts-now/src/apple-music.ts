import { Icon, updateCommandMetadata } from "@raycast/api";
import { map, parseInt, replace, split } from "lodash";
import { runAppleScript } from "run-applescript";

export enum PlayerState {
  stopped = "stopped",
  playing = "playing",
  paused = "paused",
}

export const statusMapping = {
  titles: {
    [PlayerState.stopped]: "Stopped",
    [PlayerState.playing]: "Playing",
    [PlayerState.paused]: "Paused",
  },
  icons: {
    [PlayerState.stopped]: Icon.Stop,
    [PlayerState.playing]: Icon.Play,
    [PlayerState.paused]: Icon.Pause,
  },
};

export interface StatusData {
  name: string;
  position: number;
  time: number;
  state: PlayerState;
}

const statusEmojiMapping = {
  [PlayerState.stopped]: "⏹️",
  [PlayerState.playing]: "▶️",
  [PlayerState.paused]: "⏸️",
};

export const play = async (name: string, input: string) => {
  const script = `tell application "Music"
  open location "${input}"
  set name of current track to "${replace(name, /"/g, "")}"
end tell`;
  await runAppleScript(script);
  await getStatus();
};

export const togglePause = async () => {
  const script = `tell application "Music"
  playpause
end tell`;
  await runAppleScript(script);
  await getStatus();
};

export const forward = () => {
  const script = `tell application "Music"
  set player position to (player position + 15)
end tell`;
  return runAppleScript(script);
};

export const rewind = () => {
  const script = `tell application "Music"
  set player position to (player position - 15)
end tell`;
  return runAppleScript(script);
};

export const getStatus = async (): Promise<StatusData> => {
  try {
    const name = await runAppleScript(`tell application "Music"
    get name of current track
  end tell`);
    const str = await runAppleScript(`tell application "Music"
    get {player position} & {duration} of current track
  end tell`);
    const [position, time] = map(split(str, ","), (str) => parseInt(str));
    const state = (await runAppleScript(`tell application "Music"
    get player state
  end tell`)) as PlayerState;
    const stateEmoji = statusEmojiMapping[state];
    updateCommandMetadata({ subtitle: `${stateEmoji} ${name}` });
    return {
      name,
      position,
      time,
      state,
    };
  } catch (e) {
    return {
      name: "",
      position: 0,
      time: 0,
      state: PlayerState.stopped,
    };
  }
};
