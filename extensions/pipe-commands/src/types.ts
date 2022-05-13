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

export const scriptModes = ["silent", "fullOutput", "copy", "replace"] as const;
export type ScriptMode = typeof scriptModes[number];

export interface ScriptArgument {
  type: "text";
  percentEncoded?: boolean;
}
