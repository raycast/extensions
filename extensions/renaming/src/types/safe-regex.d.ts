declare module "safe-regex" {
  function safeRegex(pattern: string | RegExp, options?: { limit?: number }): boolean;
  export = safeRegex;
}
