import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("menu-bar status refresh", () => {
  it("keeps a loaded Raycast menu command synchronized with system truth", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "night-watch-menu.tsx"),
      "utf8",
    );

    expect(source).toContain("LIVE_STATUS_INTERVAL_MS = 2_000");
    expect(source).toContain("setInterval(() => void refresh()");
    expect(source).toContain("clearInterval(interval)");
  });
});
