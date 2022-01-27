export interface ScriptCommand {
  path: string;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  selection: ScriptSelection;
}

export type ArgumentType = "text" | "file";

export interface ScriptSelection {
  type: ArgumentType;
  percentEncoded?: boolean;
}
