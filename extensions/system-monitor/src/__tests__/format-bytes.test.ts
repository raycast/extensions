import { describe, expect, it } from "vitest";

import { formatBytes } from "../utils";

describe("formatBytes", () => {
  it("formats across unit boundaries", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(682)).toBe("682 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("clamps fractional sub-byte rates instead of indexing past the unit table", () => {
    expect(formatBytes(0.67)).toBe("0.67 B");
    expect(formatBytes(0.001)).toBe("0 B");
  });
});
