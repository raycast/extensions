import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
// `__resetLocalStorage` is a stub-only test helper that the real @raycast/api
// package does not declare, so it is imported by relative path rather than
// through the "@raycast/api" specifier (which vitest aliases to this same
// file for runtime resolution; see vitest.config.ts). This keeps `tsc`
// type-checking the rest of the import against the real package's types.
import { __resetLocalStorage } from "../../test/raycast-api-stub";
import {
  listPresets,
  createPreset,
  updatePreset,
  deletePreset,
  PRESETS_KEY,
  SEEDED_KEY,
  STARTER_PRESETS,
} from "./presets";

beforeEach(() => __resetLocalStorage());

describe("listPresets seeding", () => {
  it("seeds the starter presets on a first run", async () => {
    const presets = await listPresets();
    expect(presets.map((p) => p.text)).toEqual(STARTER_PRESETS.map((p) => p.text));
  });

  it("gives every seeded preset an id", async () => {
    for (const preset of await listPresets()) {
      expect(preset.id).toBeTruthy();
    }
  });

  it("marks the seed as done so it never runs twice", async () => {
    await listPresets();
    expect(await LocalStorage.getItem(SEEDED_KEY)).toBe("true");
  });

  it("does not re-seed a preset the user deleted", async () => {
    const [first] = await listPresets();
    await deletePreset(first.id);
    const after = await listPresets();
    expect(after.some((p) => p.id === first.id)).toBe(false);
    expect(after).toHaveLength(STARTER_PRESETS.length - 1);
  });

  it("does not re-seed when the user has deleted every preset", async () => {
    for (const preset of await listPresets()) {
      await deletePreset(preset.id);
    }
    expect(await listPresets()).toEqual([]);
  });
});

describe("presets CRUD", () => {
  it("appends a created preset and returns it", async () => {
    await listPresets();
    const created = await createPreset({ emoji: "\u{1F41D}", text: "Buzzing" });
    expect(created.text).toBe("Buzzing");
    expect(created.id).toBeTruthy();
    const all = await listPresets();
    expect(all[all.length - 1]).toEqual(created);
  });

  it("gives each created preset a distinct id", async () => {
    const a = await createPreset({ emoji: "\u{1F41D}", text: "One" });
    const b = await createPreset({ emoji: "\u{1F41D}", text: "Two" });
    expect(a.id).not.toBe(b.id);
  });

  it("updates in place, preserving order", async () => {
    const seeded = await listPresets();
    const target = seeded[1];
    await updatePreset(target.id, { emoji: "\u{1F525}", text: "Renamed" });
    const after = await listPresets();
    expect(after[1]).toEqual({ id: target.id, emoji: "\u{1F525}", text: "Renamed" });
    expect(after).toHaveLength(seeded.length);
  });

  it("ignores an update for an unknown id", async () => {
    const before = await listPresets();
    await updatePreset("no-such-id", { emoji: "\u{1F525}", text: "Nope" });
    expect(await listPresets()).toEqual(before);
  });

  it("deletes by id", async () => {
    const seeded = await listPresets();
    await deletePreset(seeded[0].id);
    expect(await listPresets()).toHaveLength(seeded.length - 1);
  });

  it("ignores a delete for an unknown id", async () => {
    const before = await listPresets();
    await deletePreset("no-such-id");
    expect(await listPresets()).toEqual(before);
  });

  it("trims the emoji and the text", async () => {
    const created = await createPreset({ emoji: "  \u{1F41D}  ", text: "  Buzzing  " });
    expect(created).toMatchObject({ emoji: "\u{1F41D}", text: "Buzzing" });
  });
});

describe("presets resilience", () => {
  it("treats a corrupt value as an empty list rather than throwing", async () => {
    await LocalStorage.setItem(SEEDED_KEY, "true");
    await LocalStorage.setItem(PRESETS_KEY, "{not json");
    expect(await listPresets()).toEqual([]);
  });

  it("treats a non-array value as an empty list", async () => {
    await LocalStorage.setItem(SEEDED_KEY, "true");
    await LocalStorage.setItem(PRESETS_KEY, '{"nope":true}');
    expect(await listPresets()).toEqual([]);
  });

  it("drops entries that are not shaped like a preset", async () => {
    await LocalStorage.setItem(SEEDED_KEY, "true");
    await LocalStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ id: "a", emoji: "\u{1F41D}", text: "Good" }, { nope: true }, null]),
    );
    expect(await listPresets()).toEqual([{ id: "a", emoji: "\u{1F41D}", text: "Good" }]);
  });
});
