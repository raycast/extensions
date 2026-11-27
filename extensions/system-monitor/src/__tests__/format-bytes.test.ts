import { describe, expect, it } from "vitest";

import { formatBytes } from "../utils";

describe("formatBytes", () => {
  it("formats across unit boundaries", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(682)).toBe("682 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("moves to the next unit when rounding reaches 1024", () => {
    expect(formatBytes(1023.999)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 - 1)).toBe("1 MB");
    expect(formatBytes(1024 ** 3 - 1024)).toBe("1 GB");
    expect(formatBytes(1024 * 1024 - 6000)).toBe("1018.14 KB");
  });

  it("clamps fractional sub-byte rates instead of indexing past the unit table", () => {
    expect(formatBytes(0.67)).toBe("0.67 B");
    expect(formatBytes(0.001)).toBe("0 B");
  });
});
