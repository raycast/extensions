export type Activity = {
    id: string;
    actor: {
        name: string;
        type: string;
    }
    object: {
        name: string;
        type: string;
    }
    verb: string;
    metadata: {
        event?: string;
    }
    created_at: string;
}

export enum DomainStatus {
    PENDING="PENDING",
    ACTIVE="ACTIVE",
    ERROR="ERROR",
    DELETING="DELETING",
    DELETED="DELETED"
}
export type Domain = {
    id: string;
    name: string;
    status: DomainStatus;
    updated_at: string;
}
export type CreateDomain = {
    name: string;
    type: string;
    app_id: string;
}

export type ErrorResult = {
    status: number;
    code: string;
    message: string;
    fields?: Array<{ field: string; description: string; }>
}