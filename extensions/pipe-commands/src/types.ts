export interface ScriptCommand {
  path: string;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  selection: ScriptSelection;
}

export type ArgumentType = "text" | "file" | "url";

export interface ScriptSelection {
  type: ArgumentType;
  percentEncoded?: boolean;
}
