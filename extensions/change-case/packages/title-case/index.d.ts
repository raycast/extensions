export interface Options {
    smallWords?: Set<string>;
    locale?: string | string[];
}
export declare function titleCase(input: string, options?: Options | string[] | string): string;
