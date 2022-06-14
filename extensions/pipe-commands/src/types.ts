export interface ScriptCommand {
  path: string;
  content: string;
  user: boolean;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  description?: string;
  icon?: string;
  iconDark?: string;
  argument1: ScriptArgument;
  mode: "silent" | "fullOutput" | "compact";
  packageName?: string;
  currentDirectoryPath?: string;
  needsConfirmation?: boolean;
}

export interface ScriptArgument {
  type: "text";
  percentEncoded?: boolean;
}
