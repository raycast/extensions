import { Icon } from "@raycast/api";
import fetch from "cross-fetch";
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

export const actionMapping = {
  titles: {
    [PlayerState.paused]: "Playing",
    [PlayerState.playing]: "Paused",
  },
  icons: {
    [PlayerState.paused]: Icon.Play,
    [PlayerState.playing]: Icon.Pause,
  },
};

export interface StatusData {
  name: string;
  position: number;
  time: number;
  state: PlayerState;
}

export const statusEmojiMapping = {
  [PlayerState.stopped]: "⏹️",
  [PlayerState.playing]: "▶️",
  [PlayerState.paused]: "⏸️",
};

const getFinalLocation = async (url: string) => {
  const res = await fetch(url);
  return res.url;
};

export const play = async (name: string, input: string) => {
  const finalLocation = await getFinalLocation(input);
  const script = `tell application "Music"
  open location "${finalLocation}"
  set name of current track to "${replace(name, /"/g, "")}"
end tell`;
  return await runAppleScript(script);
};

export const togglePause = () => {
  const script = `tell application "Music"
  playpause
end tell`;
  return runAppleScript(script);
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
