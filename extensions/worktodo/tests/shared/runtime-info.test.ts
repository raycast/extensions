import { describe, expect, it } from "vitest";
import { getRuntimeInfo } from "../../src/shared/runtime-info";

describe("getRuntimeInfo", () => {
  it("reports the Worktodo identity and active Node runtime", () => {
    expect(getRuntimeInfo()).toEqual({
      app: "Worktodo",
      version: "0.0.0",
      runtime: {
        node: process.versions.node,
        sqlite: process.versions.sqlite ?? null,
      },
    });
  });
});
