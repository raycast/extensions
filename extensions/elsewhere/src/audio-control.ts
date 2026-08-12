import type { ElsewhereCommand } from "./control-url";

export type AudioControl =
  | "play"
  | "pause"
  | "ambience-louder"
  | "ambience-quieter"
  | "music-louder"
  | "music-quieter"
  | "background-music-on"
  | "background-music-off";

const controls: Record<AudioControl, { command: ElsewhereCommand; result: string }> = {
  play: {
    command: { kind: "experience", action: "play" },
    result: "Elsewhere audio is playing.",
  },
  pause: {
    command: { kind: "experience", action: "pause" },
    result: "Elsewhere audio is paused.",
  },
  "ambience-louder": {
    command: { kind: "volume", target: "ambience", delta: 10 },
    result: "Elsewhere ambience volume increased.",
  },
  "ambience-quieter": {
    command: { kind: "volume", target: "ambience", delta: -10 },
    result: "Elsewhere ambience volume decreased.",
  },
  "music-louder": {
    command: { kind: "volume", target: "music", delta: 10 },
    result: "Elsewhere music volume increased.",
  },
  "music-quieter": {
    command: { kind: "volume", target: "music", delta: -10 },
    result: "Elsewhere music volume decreased.",
  },
  "background-music-on": {
    command: { kind: "music", action: "on" },
    result: "Elsewhere background music is on.",
  },
  "background-music-off": {
    command: { kind: "music", action: "off" },
    result: "Elsewhere background music is off.",
  },
};

export function audioControl(control: AudioControl): { command: ElsewhereCommand; result: string } {
  return controls[control];
}
