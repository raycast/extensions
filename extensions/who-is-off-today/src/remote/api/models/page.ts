export type Page<T> = {
    total_count: number;
    current_page: number;
    total_pages: number;
} & T;

export function defaultPage(data?: Partial<Page<unknown>>): Page<unknown> {
    return { total_pages: 1, current_page: 1, total_count: 1, ...data };
}

export interface PageParams {
    page?: number;
    page_size?: number;
}
