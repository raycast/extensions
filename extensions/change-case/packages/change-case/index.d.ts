/**
 * Supported locale values. Use `false` to ignore locale.
 * Defaults to `undefined`, which uses the host environment.
 */
export type Locale = string[] | string | false | undefined;
export interface Options extends SplitOptions {
    locale?: Locale;
}
/**
 * Convert a string to space separated lower case (`foo bar`).
 */
export declare function noCase(input: string, options?: Options): string;
export interface SplitOptions {
    separateNumbers?: boolean;
}
/**
 * Split any cased input strings into an array of words.
 */
export declare function split(input: string, options?: SplitOptions): string[];
/**
 * Convert a string to camel case (`fooBar`).
 */
export declare function camelCase(input: string, options?: Options): string;
/**
 * Convert a string to pascal case (`FooBar`).
 */
export declare function pascalCase(input: string, options?: Options): string;
/**
 * Convert a string to pascal snake case (`Foo_Bar`).
 */
export declare function pascalSnakeCase(input: string, options?: Options): string;
/**
 * Convert a string to capital case (`Foo Bar`).
 */
export declare function capitalCase(input: string, options?: Options): string;
/**
 * Convert a string to constant case (`FOO_BAR`).
 */
export declare function constantCase(input: string, options?: Options): string;
/**
 * Convert a string to dot case (`foo.bar`).
 */
export declare function dotCase(input: string, options?: Options): string;
/**
 * Convert a string to kebab case (`foo-bar`).
 */
export declare function kebabCase(input: string, options?: Options): string;
/**
 * Convert a string to path case (`foo/bar`).
 */
export declare function pathCase(input: string, options?: Options): string;
/**
 * Convert a string to path case (`Foo bar`).
 */
export declare function sentenceCase(input: string, options?: Options): string;
/**
 * Convert a string to snake case (`foo_bar`).
 */
export declare function snakeCase(input: string, options?: Options): string;
/**
 * Convert a string to header case (`Foo-Bar`).
 */
export declare function trainCase(input: string, options?: Options): string;
