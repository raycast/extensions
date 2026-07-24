export const CONFIG_FILE_NAME = "config.json";
export const DEFAULT_MODE = "allow" as const;
export type Mode = "allow" | "block";

export type ModeList = {
  apps: string[];
  websites: string[];
};

export type Policy = {
  mode: Mode;
  allow: ModeList;
  block: ModeList;
};

export function createDefaultPolicy(): Policy {
  return {
    mode: DEFAULT_MODE,
    allow: {
      apps: [],
      websites: [],
    },
    block: {
      apps: [],
      websites: [],
    },
  };
}
