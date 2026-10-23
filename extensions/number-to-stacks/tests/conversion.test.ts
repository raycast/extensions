import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertQuery, type StackSize } from "../src/conversion.ts";

function result(query: string, stackSize: StackSize = 64) {
  const conversion = convertQuery(query, stackSize);
  assert.equal(
    conversion.status,
    "success",
    `Expected a result for ${JSON.stringify(query)}`,
  );
  if (conversion.status !== "success") throw new Error("Conversion failed");
  return conversion;
}

describe("items to stacks", () => {
  const cases = [
    ["144 to stacks", "2 stacks and 16 items"],
    ["96", "1 stack and 32 items"],
    ["64", "1 stack"],
    ["128 items to stacks", "2 stacks"],
    ["32 items", "32 items"],
    ["65", "1 stack and 1 item"],
    ["1 item to stacks", "1 item"],
    ["0", "0 items"],
    ["00096", "1 stack and 32 items"],
    ["1,024 to stacks", "16 stacks"],
    ["  144\nITEMS   to   STACKS  ", "2 stacks and 16 items"],
  ];

  for (const [query, expected] of cases) {
    it(`${JSON.stringify(query)} → ${expected}`, () => {
      assert.equal(result(query).result, expected);
      assert.equal(result(query).direction, "items-to-stacks");
    });
  }

  it("uses the selected 16-item stack size", () => {
    assert.equal(result("96", 16).result, "6 stacks");
    assert.equal(result("33 to stacks", 16).result, "2 stacks and 1 item");
  });

  it("preserves integers beyond JavaScript's safe-number range", () => {
    const conversion = result("9007199254740993");
    assert.equal(conversion.items, 9007199254740993n);
    assert.equal(conversion.result, "140,737,488,355,328 stacks and 1 item");
  });
});

describe("stacks to items", () => {
  const cases = [
    ["2 stacks to items", "128 items"],
    ["2 stacks", "128 items"],
    ["1 stack", "64 items"],
    ["0 stacks", "0 items"],
    ["1.5 stacks to items", "96 items"],
    [".5 stacks", "32 items"],
    ["0.015625 stacks", "1 item"],
    ["1.0000000000000000000000 stacks", "64 items"],
    ["2 stacks and 16 items", "144 items"],
    ["2 stacks and 16 items to items", "144 items"],
    ["2 stacks 16 items", "144 items"],
    ["1.5 stacks and 1 item", "97 items"],
    ["0 stacks and 1 item", "1 item"],
    ["1 stack and 64 items", "128 items"],
    ["1,024.5 stacks", "65,568 items"],
    ["  2   STACKS AND 16 ITEMS TO ITEMS  ", "144 items"],
  ];

  for (const [query, expected] of cases) {
    it(`${JSON.stringify(query)} → ${expected}`, () => {
      assert.equal(result(query).result, expected);
      assert.equal(result(query).direction, "stacks-to-items");
    });
  }

  it("uses 16-item stacks for whole, fractional, and mixed quantities", () => {
    assert.equal(result("2 stacks", 16).result, "32 items");
    assert.equal(result("1.5 stacks", 16).result, "24 items");
    assert.equal(result("2 stacks and 16 items", 16).result, "48 items");
  });

  it("handles fractional stacks exactly at large magnitudes", () => {
    assert.equal(
      result("9007199254740993.5 stacks").items,
      576460752303423584n,
    );
  });

  for (const stackSize of [64, 16] as const) {
    it(`rejects fractional items instead of rounding with ${stackSize}-item stacks`, () => {
      for (const query of [
        "0.1 stacks",
        "1.0000000000000001 stacks",
        "0.1 stacks and 1 item",
      ]) {
        const conversion = convertQuery(query, stackSize);
        assert.equal(conversion.status, "error");
        if (conversion.status === "error")
          assert.match(conversion.message, /No rounding/);
      }
    });

    it(`round-trips every item count from 0 to 4096 with ${stackSize}-item stacks`, () => {
      for (let count = 0; count <= 4096; count++) {
        const forward = result(String(count), stackSize);
        const reverse = result(
          `${forward.stacks} stacks and ${forward.remainder} items`,
          stackSize,
        );
        assert.equal(reverse.items, BigInt(count));
        assert.equal(
          forward.stacks * BigInt(stackSize) + forward.remainder,
          BigInt(count),
        );
        assert.ok(
          forward.remainder >= 0n && forward.remainder < BigInt(stackSize),
        );
      }
    });
  }
});

describe("invalid and empty inputs", () => {
  it("treats blank input as the welcome state", () => {
    assert.deepEqual(convertQuery("", 64), { status: "empty" });
    assert.deepEqual(convertQuery(" \t\n ", 16), { status: "empty" });
  });

  for (const query of [
    "-1",
    "-2 stacks",
    "1.5 items",
    "96.5",
    "2 stacks and 0.5 items",
    "1,00",
    "1,00 stacks",
    "1,234,56",
    "1e3",
    "Infinity",
    "NaN",
    "144 to items",
    "2 stacks to stacks",
    "two stacks",
    "144 to stacks please",
    "2 stacks + 16 items",
    "2 stacks and -1 items",
    "1/2 stacks",
    "64 * 2",
  ]) {
    it(`rejects ${JSON.stringify(query)}`, () => {
      assert.equal(convertQuery(query, 64).status, "error");
    });
  }
});
