// src/custom-types/ignore.d.ts
declare module "ignore" {
  interface Ignore {
    add(pattern: string | string[] | Ignore): Ignore;
    filter(paths: string[]): string[];
    ignores(pathname: string): boolean;
    createFilter(): (pathname: string) => boolean;
    // Добавьте другие методы, которые вы используете, если они есть
  }
  interface IgnoreFactory {
    (): Ignore;
    default?: IgnoreFactory; // Для поддержки import ignore from 'ignore'
  }
  const ignore: IgnoreFactory;
  export default ignore;
}
