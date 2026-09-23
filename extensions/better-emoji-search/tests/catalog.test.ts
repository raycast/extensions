import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { loadCatalog, resolveRecents } from "../src/catalog";
describe("offline catalog", () => {
  it("can render stored recents with readable names before any catalog has loaded", () => {
    expect(resolveRecents(["🫡", "🚀"]).map(({ emoji, description }) => ({ emoji, description }))).toEqual([
      { emoji: "🫡", description: "saluting face" },
      { emoji: "🚀", description: "rocket" },
    ]);
  });
  it("loads the current catalog and shortcodes entirely from bundled assets", async () => {
    const catalog = await loadCatalog(fileURLToPath(new URL("../assets", import.meta.url)), "15.1");
    expect(catalog).toHaveLength(1898);
    expect(catalog.every((item) => !/[\u{1F3FB}-\u{1F3FF}]/u.test(item.emoji))).toBe(true);
    expect(catalog.find((item) => item.emoji === "⚡")?.shortCode).toContain("zap");
    expect(resolveRecents(["⚡"], catalog)[0]?.shortCode).toContain("zap");
  });
  it("keeps a saved emoji visible even if it is absent from the selected catalog", () => {
    expect(resolveRecents(["🫡"], [])[0]?.emoji).toBe("🫡");
  });
});
