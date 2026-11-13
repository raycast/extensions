import { matchesFavorite, toFavoriteInsert, toShortcutFavoriteIdentifier, type FavoriteIdentifier } from "./favorites";
import type { Favorite } from "./models";

const storedFavorite: Favorite = {
  id: "favorite-1",
  userId: "profile-1",
  itemType: "shortcut",
  appSlug: "safari",
  keymapTitle: "Default",
  sectionTitle: "Tabs",
  shortcutTitle: "New Tab",
  baseShortcutId: "stable-id",
};

describe("favorite identity", () => {
  it("uses the stable shortcut ID when both sides have one", () => {
    expect(
      matchesFavorite(storedFavorite, {
        itemType: "shortcut",
        appSlug: "safari",
        keymapTitle: "Default",
        sectionTitle: "Tabs",
        shortcutTitle: "Renamed New Tab",
        baseShortcutId: "stable-id",
      })
    ).toBe(true);
  });

  it("falls back to the title for legacy shortcut favorites", () => {
    expect(
      matchesFavorite(
        { ...storedFavorite, baseShortcutId: undefined },
        {
          itemType: "shortcut",
          appSlug: "safari",
          keymapTitle: "Default",
          sectionTitle: "Tabs",
          shortcutTitle: "New Tab",
          baseShortcutId: "new-stable-id",
        }
      )
    ).toBe(true);
  });

  it("matches app and keymap favorites at their own identity grain", () => {
    const app: FavoriteIdentifier = {
      itemType: "app",
      appSlug: "safari",
    };
    const keymap: FavoriteIdentifier = {
      itemType: "keymap",
      appSlug: "safari",
      keymapTitle: "Default",
    };

    expect(matchesFavorite({ id: "app-favorite", userId: "profile-1", ...app }, app)).toBe(true);
    expect(matchesFavorite({ id: "keymap-favorite", userId: "profile-1", ...keymap }, keymap)).toBe(true);
  });

  it("builds shortcut favorite identity from the stable public shortcut fields", () => {
    expect(
      toShortcutFavoriteIdentifier({ slug: "safari", customAppId: undefined }, "Default", "Renamed Tabs", {
        title: "Renamed New Tab",
        sequence: [],
        baseSectionTitle: "Tabs",
        baseShortcutTitle: "New Tab",
        baseShortcutId: "stable-id",
      })
    ).toEqual({
      itemType: "shortcut",
      appSlug: "safari",
      customAppId: undefined,
      keymapTitle: "Default",
      sectionTitle: "Tabs",
      shortcutTitle: "New Tab",
      baseShortcutId: "stable-id",
    });
  });

  it("writes absent identity fields as null for PostgREST uniqueness", () => {
    expect(
      toFavoriteInsert("profile-1", {
        itemType: "app",
        appSlug: "safari",
      })
    ).toEqual({
      user_id: "profile-1",
      item_type: "app",
      app_slug: "safari",
      keymap_title: null,
      section_title: null,
      shortcut_title: null,
      base_shortcut_id: null,
      custom_app_id: null,
      custom_keymap_id: null,
      custom_shortcut_id: null,
    });
  });
});

describe("private stable favorites", () => {
  it("matches renamed and moved private children by target ID", () => {
    expect(
      matchesFavorite(
        { id: "f", userId: "u", itemType: "shortcut", customShortcutId: "s", shortcutTitle: "Before" },
        { itemType: "shortcut", customShortcutId: "s", shortcutTitle: "After", sectionTitle: "Moved" }
      )
    ).toBe(true);
    expect(
      matchesFavorite(
        { id: "f", userId: "u", itemType: "keymap", customKeymapId: "k" },
        { itemType: "keymap", customKeymapId: "other" }
      )
    ).toBe(false);
    expect(
      matchesFavorite(
        { id: "f", userId: "u", itemType: "app", customAppId: "app", appSlug: "before" },
        { itemType: "app", customAppId: "app", appSlug: "after" }
      )
    ).toBe(true);
  });
  it("creates private shortcut identifiers and stores no ancestor FK", () => {
    const identity = toShortcutFavoriteIdentifier({ slug: "custom-app", customAppId: "app" }, "Keys", "Section", {
      title: "Copy",
      sequence: [],
      customizationId: "s",
    });
    expect(identity.customShortcutId).toBe("s");
    expect(toFavoriteInsert("u", identity)).toMatchObject({ custom_shortcut_id: "s", custom_app_id: null });
  });
});

describe("public custom favorite compatibility", () => {
  it("uses a created public shortcut ID but retains base identity for overrides", () => {
    const created = toShortcutFavoriteIdentifier({ slug: "safari" }, "My keys", "Tabs", {
      title: "Created action",
      sequence: [],
      customizationStatus: "created",
      customizationId: "created-id",
    });
    expect(created.customShortcutId).toBe("created-id");
    expect(
      matchesFavorite(
        { id: "f", userId: "u", itemType: "shortcut", customKeymapId: "parent", customShortcutId: "created-id" },
        created
      )
    ).toBe(true);
    const override = toShortcutFavoriteIdentifier({ slug: "safari" }, "Default", "Tabs", {
      title: "Override",
      sequence: [],
      customizationStatus: "changed",
      customizationId: "override-id",
      baseShortcutId: "base-id",
    });
    expect(override.customShortcutId).toBeUndefined();
    expect(override.baseShortcutId).toBe("base-id");
  });
  it("does not mistake an ancestor keymap ID for a shortcut target", () => {
    expect(
      matchesFavorite(
        { ...storedFavorite, customKeymapId: "parent" },
        {
          itemType: "shortcut",
          appSlug: "safari",
          keymapTitle: "Default",
          sectionTitle: "Tabs",
          baseShortcutId: "stable-id",
        }
      )
    ).toBe(true);
  });
});
