import { Color } from "@raycast/api";

export interface Preferences {
  enableSounds: boolean;
}

export interface State {
  loading: boolean;
  gameState: string;
  level: number;
  sequence: string[];
  humanSequence: string[];
  colors: { name: string; tint: Color }[];
}
