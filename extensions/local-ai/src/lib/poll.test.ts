import { describe, expect, it } from "vitest";
import { pollForText } from "./poll";

function setup(values: Array<string | undefined>) {
  const sleeps: number[] = [];
  let reads = 0;
  return {
    sleeps,
    reads: () => reads,
    options: { intervalMs: 25, timeoutMs: 100, sleep: async (ms: number) => void sleeps.push(ms) },
    read: async () => values[reads++],
  };
}

describe("pollForText", () => {
  it("returns the first non-empty value and stops reading", async () => {
    const s = setup([undefined, "", "copied", "later"]);
    expect(await pollForText(s.read, s.options)).toBe("copied");
    expect(s.reads()).toBe(3);
  });

  it("gives up after timeout divided by interval attempts", async () => {
    const s = setup([]);
    expect(await pollForText(s.read, s.options)).toBeUndefined();
    expect(s.reads()).toBe(4);
    expect(s.sleeps).toEqual([25, 25, 25, 25]);
  });
});
