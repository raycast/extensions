import assert from "node:assert/strict";

/** The few matchers the tests use, on top of node:assert, so the tests need no test library. */
export function expect(actual: unknown) {
  const text = () => String(actual);
  return {
    toBe: (expected: unknown) => assert.equal(actual, expected),
    toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
    toContain: (part: string) =>
      assert.ok(text().includes(part), `expected to contain ${JSON.stringify(part)}:\n${text()}`),
    toMatch: (pattern: RegExp) => assert.match(text(), pattern),
    toHaveLength: (length: number) => assert.equal((actual as { length: number }).length, length),
    toBeUndefined: () => assert.equal(actual, undefined),
    toBeGreaterThan: (n: number) => assert.ok((actual as number) > n, `${actual} is not greater than ${n}`),
    toBeLessThan: (n: number) => assert.ok((actual as number) < n, `${actual} is not less than ${n}`),
    not: {
      toContain: (part: string) =>
        assert.ok(!text().includes(part), `expected not to contain ${JSON.stringify(part)}:\n${text()}`),
    },
  };
}
