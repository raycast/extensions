export interface PageMeta {
    title: string | null;
    ogImage: string | null;
}
export declare function fetchPageMeta(pageUrl: string): Promise<PageMeta>;
export declare function fetchPageTitle(pageUrl: string): Promise<string | null>;
