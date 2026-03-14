import { describe, expect, it } from "vitest";
import { targetKey } from "../lib/targets";

describe("targetKey", () => {
  it("includes workspace when present", () => {
    expect(targetKey({ directory: "/tmp/app", workspace: "feature-a" })).toBe(
      "/tmp/app::feature-a",
    );
  });

  it("uses empty workspace suffix when absent", () => {
    expect(targetKey({ directory: "/tmp/app" })).toBe("/tmp/app::");
  });
});
