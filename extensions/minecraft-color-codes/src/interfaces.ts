import { Icon } from "@raycast/api";

export interface Color {
  name: string;
  chatCode: string;
  hexCode: string;
  keywords?: string[];
}

export interface Format {
  name: string;
  icon: Icon;
  chatCode: string;
  javaEdition: boolean;
  bedrockEdition: boolean;
}
