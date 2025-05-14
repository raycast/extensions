export type Product = {
    id: string;
    mode: "test" | "prod" | "sandbox";
    name: string;
    description: string;
    price: number;
    status: string;
    created_at: string;
}

export type PaginatedResult<T> = {
    items: T[];
    pagination: {
        total_records: number;
        total_pages: number;
        current_page: number;
        next_page: number | null;
        prev_page: number | null;
    }
}