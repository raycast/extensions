type InputTypes = "string" | "integer" | "number" | "boolean" | "object" | "array";
export interface Field {
    type: InputTypes;
    description: string;
    default: any;
    contentEncoding?: string;
    format?: string;
    enum?: string[];
}

export interface InputObject {
    [key: string]: Field;
}

export type WorkspaceConfig = {
    id?: string;
    remoteURL: string;
    workspaceName: string;
    workspaceId: string;
    workspaceToken: string;
}


export type Resource = {
    workspace_id: string;
    path: string;
    description: string;
    resource_type: string;
    is_oauth: boolean;
    extra_perms: object;
    is_expired: boolean;
    refresh_error: string;
    is_linked: boolean;
    is_refreshed: boolean;
    account: number;
}
export type Kind = "flow" | "app" | "script" | "raw_app";

