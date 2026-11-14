import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

describe("extension icons", () => {
  it("keeps the menu-bar icon aligned with the manifest asset", () => {
    const manifest = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as { icon: string };
    const menuBarSource = readFileSync(resolve(projectRoot, "src/menu-bar.tsx"), "utf8");
    const referencedPngs = [...menuBarSource.matchAll(/"([^"]+\.png)"/g)].flatMap((match) =>
      match[1] ? [match[1]] : [],
    );

    expect(referencedPngs).toContain(manifest.icon);
    for (const icon of referencedPngs) {
      expect(existsSync(resolve(projectRoot, "assets", icon))).toBe(true);
    }
  });
});
