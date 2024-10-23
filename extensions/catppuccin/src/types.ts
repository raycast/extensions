export interface PortDetails {
  name: string;
  platform?: string | string[];
  categories?: string[];
  icon?: string;
  color?: string;
}

export interface UserStyleDetails {
  name: string | string[];
  categories?: string[];
  icon?: string;
  color?: string;
  readme?: {
    "app-link"?: string | string[];
    usage?: string;
  };
  currentMaintainers?: string[];
  pastMaintainers?: string[];
}

export interface PortsYaml {
  ports: Record<string, PortDetails>;
}

export interface UserStylesYaml {
  userstyles: Record<string, UserStyleDetails>;
}

export interface Preferences {
  gridSize: string;
}

export interface ColorDetails {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}
