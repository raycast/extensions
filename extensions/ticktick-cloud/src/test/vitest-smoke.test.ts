import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs on a supported Node runtime", () => {
    expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(22);
  });
});
