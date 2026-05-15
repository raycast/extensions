declare module "jsesc" {
  interface Options {
    quotes?: "single" | "double";
    wrap?: boolean;
    minimal?: boolean;
    json?: boolean;
  }

  function jsesc(value: string, options?: Options): string;

  export default jsesc;
}
