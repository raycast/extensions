// Minimal Jest-compatible `expect` shim backed by node:assert, so the unit
// tests run on Node's built-in test runner with ZERO extra dependencies.
// Covers exactly the matchers the suite uses — toBe, toEqual, toContain,
// toBeUndefined, toHaveLength — plus their `.not` negations.
import assert from "node:assert/strict";

function matchers(actual: unknown, negate: boolean) {
  const contains = (item: unknown): boolean =>
    Array.isArray(actual)
      ? actual.includes(item)
      : typeof actual === "string" && actual.includes(String(item));
  const length = (): unknown => (actual as { length?: unknown })?.length;

  return {
    toBe(expected: unknown) {
      (negate ? assert.notStrictEqual : assert.strictEqual)(actual, expected);
    },
    toEqual(expected: unknown) {
      (negate ? assert.notDeepStrictEqual : assert.deepStrictEqual)(
        actual,
        expected
      );
    },
    toContain(item: unknown) {
      assert.ok(
        negate ? !contains(item) : contains(item),
        `expected ${JSON.stringify(actual)} to ${
          negate ? "not " : ""
        }contain ${JSON.stringify(item)}`
      );
    },
    toBeUndefined() {
      (negate ? assert.notStrictEqual : assert.strictEqual)(actual, undefined);
    },
    toHaveLength(expected: number) {
      (negate ? assert.notStrictEqual : assert.strictEqual)(length(), expected);
    },
  };
}

/** Jest-style `expect(actual)` with a `.not` chain, mapped onto node:assert. */
export function expect(actual: unknown) {
  return { ...matchers(actual, false), not: matchers(actual, true) };
}
