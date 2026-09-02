import { z } from "zod";
export declare const BLOCKED_URL_SCHEMES: readonly ["javascript:", "data:", "vbscript:", "file:", "blob:", "filesystem:"];
export declare function isAllowedBookmarkUrl(url: string): boolean;
export declare function guardBookmarkUrl(url: string): string;
export declare const bookmarkUrlSchema: z.ZodEffects<z.ZodString, string, string>;
