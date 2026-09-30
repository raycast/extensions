// src/custom-types/ignore.d.ts
declare module "ignore" {
  interface Ignore {
    add(pattern: string | string[] | Ignore): Ignore;
    filter(paths: string[]): string[];
    ignores(pathname: string): boolean;
    createFilter(): (pathname: string) => boolean;
    // Add other methods that you use, if any
  }
  interface IgnoreFactory {
    (): Ignore;
    default?: IgnoreFactory; // For supporting import ignore from 'ignore'
  }
  const ignore: IgnoreFactory;
  export default ignore;
}
