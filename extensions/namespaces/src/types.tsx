import { Icon } from "@raycast/api";

type Color = {
  [index: string]: string;
};

type ModifierMap = {
  [index: string]: string;
};

type IconMap = {
  [index: string]: Icon;
};

type Space = {
  id: string;
  name: string;
  keyCode: string | undefined;
  modifiers: string[];
  color: string;
  icon: string;
  confetti: boolean;
  configured: boolean;
};

type CreatOrUpdateSpaceOptions = {
  create: boolean;
};

type SpaceFormValues = {
  name: string;
  keyCode: string;
  color: string;
  icon: string;
  confetti: boolean;
  modifiers: string[];
};

export type { Color, ModifierMap, IconMap, Space, CreatOrUpdateSpaceOptions, SpaceFormValues };
