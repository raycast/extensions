enum Status {
    BLANK="BLANK",
    DRAFT="DRAFT",
    PUBLISHED="PUBLISHED",
    DELETED ="DELETED",
}
export interface Form {
    id: string;
    name: string;
    status: Status;
    updatedAt: string;
}

interface Member {
    id: string;
}
interface Invite {
    id: string;
}
export interface Workspace {
    id: string;
    name: string | null;
    members: Member[];
    invites: Invite[];
}

export interface PaginatedResult<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}