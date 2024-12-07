export interface PortDetails {
  name: string;
  platform?: string | string[];
  categories?: string[];
  icon?: string;
  color?: string;
  alias?: string;
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
