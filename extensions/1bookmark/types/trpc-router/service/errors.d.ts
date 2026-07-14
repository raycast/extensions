export declare class BookmarkUrlDuplicateError extends Error {
    readonly url: string;
    constructor(url: string);
}
export declare class BookmarkImportStaleError extends Error {
    constructor();
}
