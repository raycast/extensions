export declare class BookmarkUrlDuplicateError extends Error {
    readonly url: string;
    constructor(url: string);
}
export declare class BookmarkImportStaleError extends Error {
    constructor();
}
export declare class TagNameDuplicateError extends Error {
    readonly tagName: string;
    constructor(tagName: string);
}
