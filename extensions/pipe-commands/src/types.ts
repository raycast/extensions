export interface ScriptCommand {
    path: string,
    metadatas: ScriptMetadatas
}

export interface ScriptMetadatas {
    title: string;
    description?: string;
    packageName?: string;
    argument1: ScriptArgument;
}

export type ArgumentType = "text" | "file" | "url"

export interface ScriptArgument {
    type: ArgumentType;
    percentEncoded?: boolean;
}
