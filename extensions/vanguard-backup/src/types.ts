export type Server = {
    id: number;
    user_id: number;
    label: string;
    connection: {
        ip_address: string
        username: string
        port: number
        is_database_password_set: boolean
    },
    status: {
        connectivity: "connected" | "unknown";
        last_connected_at: string;
    },
    created_at: string;
    updated_at: string;
}
export type CreateServer = {
  label: string;
  ip_address: string;
  username: string;
  port: number;
  database_password: string;
}
export type SuccessResult<T> = {
    data: T;
}
export type PaginatedResult<T> = SuccessResult<T[]> & {
    next?: string | null;
}

export type ErrorResult = {
    error?: string;
    message: string;
    errors?: {
        [field: string]: string[];
    }
}