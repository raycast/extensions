import { playbackSpeedValues } from "../resources/playbackSpeedValues";

export type PlaybackSpeed = (typeof playbackSpeedValues)[number];
export type CalculationOutput = {
  playbackDuration: string;
  timeSaved: string;
  completionTime: string;
};
