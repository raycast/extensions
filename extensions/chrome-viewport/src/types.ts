export type PresetClass = "laptop" | "tablet" | "phone" | "custom";

export interface Preset {
  id: string;
  name: string;
  class: PresetClass;
  viewport: { w: number; h: number };
  basis: "screen" | "split" | "custom";
  dpr: number;
  pointer: "fine" | "coarse";
  hover: boolean;
  strategy: "window" | "info";
  warnings: string[];
}

export interface PresetFile {
  version: number;
  cycle?: string[];
  presets: Preset[];
}
