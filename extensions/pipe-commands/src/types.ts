export interface ScriptCommand {
  path: string;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  icon?: string;
  argument1: ScriptInput;
  packageName?: string;
  currentDirectoryPath?: string;
}

export type ArgumentType = "text" | "file";

export interface ScriptInput {
  type: ArgumentType;
  percentEncoded?: boolean;
}
