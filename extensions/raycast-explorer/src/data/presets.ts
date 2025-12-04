import { AI, Icon } from "@raycast/api";

export type Preset = {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  icon: Icon | string;
  creativity: "none" | "low" | "medium" | "high" | "maximum";
  model: AI.Model;
  web_search?: boolean;
  image_generation?: boolean;
  date: `${number}-${number}-${number}`;
  author?: {
    name: string;
    link?: string;
  };
  tools?: {
    name: string;
    id: string;
  }[];
};

export type PresetCategory = {
  name: string;
  slug: string;
  icon: string;
  presets: Preset[];
};
