import type { BRANDS, VOLUME_PRESETS } from "./constants";

export type SwitchName = (typeof BRANDS)[number]["switches"][number]["name"] | "None";

export type Brand = {
  name: string;
  switches: readonly { name: SwitchName; tint: string; icon?: string }[];
};

export type VolumePreset = (typeof VOLUME_PRESETS)[keyof typeof VOLUME_PRESETS];

export type KlackState = {
  enabled: boolean;
  sleeping: boolean;
  switch: string;
  volume: number;
};
