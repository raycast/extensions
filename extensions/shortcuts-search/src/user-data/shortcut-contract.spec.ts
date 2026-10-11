import { describe, expect, it } from "@jest/globals";
import grammar from "../shortcut-core/fixtures/grammar.json";
import identities from "../shortcut-core/fixtures/identities.json";
import overlays from "../shortcut-core/fixtures/overlays.json";
import favorites from "../shortcut-core/fixtures/favorites.json";
import { parseKey } from "../shortcut-core/parser";
import { getBaseShortcutId, getCompatibleIds } from "../shortcut-core/identity";
import { resolveOverlayField } from "../shortcut-core/overlay";
import { matchesFavorite, type FavoriteIdentifier } from "../shortcut-core/favorites";
import { ShortcutMerger } from "./shortcut-merger";
import { modifierMapping } from "../model/internal/modifiers";
const codes = new Set(["+", "c", "k", "shift"]);
const shortcut = (title: string, key: string) => ({
  title,
  sequence: parseKey(key).map((chord) => ({
    base: chord.base,
    modifiers: chord.modifiers.map((token) => modifierMapping.get(token)!),
  })),
});
describe("shared shortcut contract", () => {
  it.each(grammar)("parses $key consistently", (fixture) => {
    const parse = () => parseKey(fixture.key, (base) => codes.has(base));
    if (fixture.invalid) expect(parse).toThrow();
    else expect(parse()).toEqual(fixture.sequence);
  });
  it.each(identities)("preserves $title occurrence $occurrence identity", (fixture) => {
    const row = shortcut(fixture.title, fixture.key);
    expect(getBaseShortcutId(row, fixture.occurrence)).toBe(fixture.id);
    if (fixture.legacy) expect(getCompatibleIds([row]).get(fixture.id)).toContain(fixture.legacy);
    if (fixture.legacyWindows) expect(getCompatibleIds([row]).get(fixture.id)).toContain(fixture.legacyWindows);
  });
  it.each(overlays)("resolves inherit/replace/clear", (fixture) =>
    expect(resolveOverlayField("Original", fixture.replacement, fixture.cleared)).toBe(fixture.expected)
  );
  it.each(favorites)("matches stable private references", (fixture) =>
    expect(matchesFavorite(fixture.favorite as FavoriteIdentifier, fixture.identifier as FavoriteIdentifier)).toBe(
      fixture.matches
    )
  );
  it("applies a stored plus-key overlay through the actual consumer adapter", () => {
    const fixture = identities.find((value) => value.legacy)!;
    const data = {
      customApps: [],
      customKeymaps: [],
      favorites: [],
      shortcuts: [
        {
          baseKey: "sample:Default:General:Zoom",
          baseShortcutId: fixture.legacy,
          modification: { id: "overlay", comment: "Changed", keyIsCleared: true },
        },
      ],
    };
    const result = new ShortcutMerger(data).mergeShortcuts(
      [
        {
          name: "Sample",
          slug: "sample",
          keymaps: [{ title: "Default", sections: [{ title: "General", hotkeys: [shortcut("Zoom", "cmd++")] }] }],
        },
      ],
      data
    );
    expect(result[0].keymaps[0].sections[0].hotkeys[0]).toMatchObject({
      title: "Zoom",
      sequence: [],
      comment: "Changed",
      customizationId: "overlay",
    });
  });
});

it("does not attach an ambiguous Windows command ID to a control row", () => {
  const command = shortcut("Copy", "cmd+c");
  const control = shortcut("Copy", "ctrl+c");
  const oldId = getBaseShortcutId(control, 0);
  const data = {
    customApps: [],
    customKeymaps: [],
    favorites: [],
    shortcuts: [
      {
        baseKey: "sample:Default:General:Copy",
        baseShortcutId: oldId,
        modification: { id: "old-overlay", comment: "Ambiguous" },
      },
    ],
  };
  const base = [
    {
      name: "Sample",
      slug: "sample",
      keymaps: [{ title: "Default", sections: [{ title: "General", hotkeys: [command, control] }] }],
    },
  ];
  const rows = new ShortcutMerger(data).mergeShortcuts(base, data)[0].keymaps[0].sections[0].hotkeys;
  expect(rows.every((row) => !row.customizationId)).toBe(true);
  expect(rows[1].baseShortcutId).toBe(`v2:${oldId}`);
  expect(rows[1].baseShortcutAliases ?? []).not.toContain(oldId);
  const repaired = { ...data, shortcuts: [{ ...data.shortcuts[0], baseShortcutId: rows[1].baseShortcutId }] };
  expect(
    new ShortcutMerger(repaired).mergeShortcuts(base, repaired)[0].keymaps[0].sections[0].hotkeys[1].customizationId
  ).toBe("old-overlay");
});

it("keeps a versioned identity readable when a conflicting neighbor is removed", () => {
  const control = shortcut("Copy", "ctrl+c");
  const command = shortcut("Copy", "cmd+c");
  const empty = { customApps: [], customKeymaps: [], favorites: [], shortcuts: [] };
  const base = (hotkeys: (typeof control)[]) => [
    { name: "Sample", slug: "sample", keymaps: [{ title: "Default", sections: [{ title: "General", hotkeys }] }] },
  ];
  const versionedId = new ShortcutMerger(empty).mergeShortcuts(base([command, control]), empty)[0].keymaps[0]
    .sections[0].hotkeys[1].baseShortcutId!;
  const saved = {
    ...empty,
    shortcuts: [
      {
        baseKey: "sample:Default:General:Copy",
        baseShortcutId: versionedId,
        modification: { id: "saved", comment: "Retained" },
      },
    ],
  };
  const row = new ShortcutMerger(saved).mergeShortcuts(base([control]), saved)[0].keymaps[0].sections[0].hotkeys[0];
  expect(row.customizationId).toBe("saved");
  expect(
    matchesFavorite(
      { itemType: "shortcut", baseShortcutId: versionedId },
      { itemType: "shortcut", baseShortcutId: row.baseShortcutId, baseShortcutAliases: row.baseShortcutAliases }
    )
  ).toBe(true);
});
