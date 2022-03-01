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

export type ArgumentType = "text" | "file";

export type ScriptMode = "silent" | "fullOutput" | "copy" | "replace";

export interface ScriptArgument {
  type: ArgumentType;
  percentEncoded?: boolean;
}
