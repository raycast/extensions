import { Icon } from "@raycast/api";

export interface Space {
  index: number;
  name: string;
  icon?: Icon;
}

export interface ConfigureSpacesLaunchContext {
  spaceIndex: number;
}
