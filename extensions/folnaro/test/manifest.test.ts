import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function pngSize(path: string): { width: number; height: number } {
  const data = readFileSync(path);
  expect(data.subarray(1, 4).toString()).toBe("PNG");
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

describe("Manifest", () => {
  it("is ready for the Store", () => {
    expect(manifest.license).toBe("MIT");
    expect(manifest.platforms).toEqual(["macOS"]);
    expect(manifest.categories.length).toBeGreaterThan(0);
    expect(pngSize(join(root, "assets", manifest.icon))).toEqual({ width: 512, height: 512 });
  });

  it("has a source file and a 512 px light and dark icon for every command", () => {
    for (const command of manifest.commands) {
      expect(existsSync(join(root, "src", `${command.name}.tsx`)), command.name).toBe(true);
      const light = join(root, "assets", command.icon);
      const dark = light.replace(/\.png$/, "@dark.png");
      expect(pngSize(light), command.icon).toEqual({ width: 512, height: 512 });
      expect(pngSize(dark), command.icon).toEqual({ width: 512, height: 512 });
    }
  });

  it("titles commands in Apple style title case without articles", () => {
    for (const command of manifest.commands) {
      expect(command.title).toMatch(/^([A-Z][a-z]+)( [A-Z][a-z]+)*$/);
      expect(command.title).not.toMatch(/\b(A|An|The)\b/);
    }
  });

  it("keeps the menu bar command battery friendly", () => {
    const menuBar = manifest.commands.find((command: { mode: string }) => command.mode === "menu-bar");
    expect(menuBar.interval).toBe("1m");
  });
});
