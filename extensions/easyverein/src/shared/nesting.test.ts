import { describe, expect, it } from "vitest";
import { nestItems } from "./nesting";
import type { RegistryItem } from "./registry";

function item(id: string, parent: string | null = null): RegistryItem {
  return {
    id,
    kind: "url",
    url: `/${id}/`,
    label: id.toUpperCase(),
    icon: "fa-cog",
    keywords: [],
    group: "settings",
    parent,
  };
}

const registry = [
  item("settings"),
  item("tab-a", "settings"),
  item("tab-b", "settings"),
  item("other"),
];

describe("nestItems", () => {
  it("moves matching children below their matching parent in registry order", () => {
    const { items, rows } = nestItems(
      [item("tab-b", "settings"), item("other"), item("settings"), item("tab-a", "settings")],
      registry,
    );
    expect(items.map((entry) => entry.id)).toEqual(["settings", "tab-a", "tab-b", "other"]);
    expect(rows.get("tab-a")).toEqual({ nested: true, last: false });
    expect(rows.get("tab-b")).toEqual({ nested: true, last: true });
    expect(rows.has("settings")).toBe(false);
  });

  it("lists a child on its own with the parent label when the parent did not match", () => {
    const { items, rows } = nestItems([item("tab-a", "settings")], registry);
    expect(items.map((entry) => entry.id)).toEqual(["tab-a"]);
    expect(rows.get("tab-a")).toEqual({ parentLabel: "SETTINGS" });
  });

  it("keeps items without a parent unchanged", () => {
    const { items, rows } = nestItems([item("other")], registry);
    expect(items.map((entry) => entry.id)).toEqual(["other"]);
    expect(rows.size).toBe(0);
  });
});
