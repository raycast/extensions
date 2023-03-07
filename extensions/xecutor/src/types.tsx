import { Application } from "@raycast/api";

type Preset = {
  id?: string | undefined;
  name: string;
  icon: string;
  color: string;
  apps: Application[];
  urls: string[];
  new?: boolean;
};

type PresetFormValues = {
  name: string;
  icon: string;
  color: string;
};

export type { Preset, PresetFormValues };
