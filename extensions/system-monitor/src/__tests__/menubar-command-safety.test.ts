import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("menu-bar command integration", () => {
  it("delegates collection and persistence to the launch-aware snapshot loader", () => {
    const source = readFileSync(path.join(process.cwd(), "src/menubar-system-monitor.tsx"), "utf8");

    expect(source).toContain("loadMenuBarSnapshot");
    expect(source).not.toContain("getNetworkData");
    expect(source).not.toContain("getTemperatureData");
    expect(source).not.toMatch(/cache\.set\(/);
  });
});
