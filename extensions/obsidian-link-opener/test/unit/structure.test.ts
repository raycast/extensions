import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

describe("Project Structure", () => {
  it("should have all required directories", () => {
    expect(existsSync(join(__dirname, "../../src"))).toBe(true);
    expect(existsSync(join(__dirname, "../../src/commands"))).toBe(true);
    expect(existsSync(join(__dirname, "../../src/utils"))).toBe(true);
  });

  it("should have all required files", () => {
    expect(
      existsSync(join(__dirname, "../../src/commands/open-link.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(__dirname, "../../src/commands/refresh-index.tsx"))
    ).toBe(true);
    expect(existsSync(join(__dirname, "../../src/utils/preferences.ts"))).toBe(
      true
    );
  });
});
