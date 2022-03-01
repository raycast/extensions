export interface ScriptCommand {
  path: string;
  content: string;
  user: boolean;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  icon?: string;
  argument1: ScriptArgument;
  mode: ScriptMode;
  packageName?: string;
  currentDirectoryPath?: string;
}

export const argumentTypes = ["text", "file"] as const;
export type ArgumentType = typeof argumentTypes[number];

export const scriptModes = ["silent", "fullOutput", "copy", "replace"] as const;
export type ScriptMode = typeof scriptModes[number];

export interface ScriptArgument {
  type: ArgumentType;
  percentEncoded?: boolean;
}
