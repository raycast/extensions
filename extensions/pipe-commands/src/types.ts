export interface ScriptCommand {
  path: string;
  metadatas: ScriptMetadatas;
}

export interface ScriptMetadatas {
  title: string;
  input: ScriptInput;
}

export type ArgumentType = "text" | "file";

export interface ScriptInput {
  type: ArgumentType;
  percentEncoded?: boolean;
}
