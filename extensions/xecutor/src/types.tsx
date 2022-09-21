import { Application } from "@raycast/api";

type Preset = {
  id?: string | undefined;
  name: string;
  apps: Application[];
  urls: string[];
  new?: boolean;
};

type PresetNameFormValues = {
  name: string;
};

export type { Preset, PresetNameFormValues };
