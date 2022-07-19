export interface ScriptCommand {
  path: string;
  content: string;
  user: boolean;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  schemaVersion: 1;
  title: string;
  description?: string;
  icon?: string;
  iconDark?: string;
  argument1?: ScriptArgument;
  mode: "silent" | "pipe";
  packageName?: string;
  currentDirectoryPath?: string;
  needsConfirmation?: boolean;
}

export interface ScriptArgument {
  type: "text";
  percentEncoded?: boolean;
}
