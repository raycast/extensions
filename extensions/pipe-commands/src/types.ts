export interface ScriptCommand {
  path: string;
  content: string;
  user: boolean;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  icon?: string;
  iconDark?: string;
  argument1: ScriptArgument;
  mode: "silent" | "fullOutput" | "compact" |  "copy" | "replace";
  packageName?: string;
  currentDirectoryPath?: string;
}

export interface ScriptArgument {
  type: "text";
  percentEncoded?: boolean;
}
