export type ScriptCommand = {
  path: string;
  content: string;
  user: boolean;
  metadatas: ScriptMetadatas;
};

export type ScriptMetadatas = {
  schemaVersion: 1;
  title: string;
  description?: string;
  icon?: string;
  iconDark?: string;
  packageName?: string;
  currentDirectoryPath?: string;
  needsConfirmation?: boolean;
} & (
  | {
      mode: "silent";
      argument1: ScriptArgument;
    }
  | {
      mode: "pipe";
      inputType?: ScriptInput;
      outputType?: ScriptOutput;
    }
);

export type ScriptInput = {
  type: InputType;
};

export type ScriptArgument = {
  type: InputType;
  percentEncoded?: boolean;
};

export type InputType = "text" | "file" | "url" | "clipboard";
export type ScriptOutput = "text" | "url";
