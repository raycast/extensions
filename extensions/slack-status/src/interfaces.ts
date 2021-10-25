import { ImageLike } from "@raycast/api";
import { WebAPICallError } from "@slack/web-api";

export interface SlackStatus {
  emojiCode: string;
  title: string;
  expiration?: number; // timestamp in milliseconds
}

export interface SlackStatusResponse {
  status?: SlackStatus;
  error?: WebAPICallError;
}

export interface CurrentStatusState {
  status?: SlackStatus;
  icon?: ImageLike;
  title: string;
  subtitle?: string;
  isError: boolean;
}

export interface SlackStatusPreset {
  emojiCode: string;
  title: string;
  defaultDuration: number; // 0 means "don't clear"
}

export type SlackStatusResponseState = [
  SlackStatusResponse | undefined,
  (response: SlackStatusResponse | undefined) => void
];

export type SlackStatusPresetsListState = [SlackStatusPreset[], (presets: SlackStatusPreset[]) => void];
