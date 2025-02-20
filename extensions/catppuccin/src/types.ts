import type { ColorName } from "@catppuccin/palette";

export interface Port {
  name: string;
  platform: string | string[];
  categories: string[];
  color: ColorName;
  icon?: string;
  alias?: string;
  currentMaintainers: string[];
  pastMaintainers?: string[];
}

export interface Userstyle {
  name: string | string[];
  categories: string[];
  icon?: string;
  color: ColorName;
  readme: {
    "app-link": string | string[];
    usage?: string;
  };
  currentMaintainers: string[];
  pastMaintainers?: string[];
}

export interface Category {
  key: string;
  name: string;
  description: string;
  emoji: string;
}

export interface PortsYaml {
  ports: Record<string, Port>;
  categories: Array<Category>;
}

export interface UserStylesYaml {
  userstyles: Record<string, Userstyle>;
}
