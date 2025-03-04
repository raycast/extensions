/**
 * Ensure that switch/if-else statements are exhaustive.
 *
 * @param _value - The value to check
 * @param err - Error message to throw if the check fails
 *
 * @example
 * const Color = {
 *   Red: "red",
 *   Green: "green",
 * } as const;
 *
 * type Color = (typeof Color)[keyof typeof Color];
 *
 * const accentColor = Color.Red;
 *
 * function getColorName(color: Color) {
 *   switch (color) {
 *     case Color.Red:
 *       return "red" as const;
 *     case Color.Green:
 *       return "green" as const;
 *     default:
 *      // This will raise a (type) error if the switch statement is not exhaustive
 *       exhaustive(color, "Invalid color");
 *   }
 * }
 */
function exhaustive(_value: never, err?: Error | string): never {
  if (err instanceof Error) {
    throw err;
  }

  if (typeof err === "string") {
    throw new Error(err);
  }

  throw new Error("Exhaustive check failed.");
}

export { exhaustive };
