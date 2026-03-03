/**
 * Returns a factory that validates a tuple of keys against the keys of `T` at compile time,
 * ensuring every key of `T` is present and no extra keys are included.
 *
 * @example
 * ```ts
 * type Options = { a: string; b: number };
 * const keys = asOptionKeys<Options>()(["a", "b"]); // compiles
 * const keys = asOptionKeys<Options>()(["a"]);       // error — missing "b"
 * ```
 */
export function asOptionKeys<T extends object>() {
  return <K extends readonly (keyof T)[]>(arr: keyof T extends K[number] ? K : never): K => arr;
}
