import { mapCustomizations, mapFavorites, mapProfile } from "./mappers";

describe("user-data mappers", () => {
  it("maps the current profile", () => {
    expect(
      mapProfile({
        id: "profile-1",
        clerk_user_id: "user_1",
        display_name: "Max",
        avatar_url: "https://example.com/avatar.png",
        created_at: "2026-07-30T00:00:00Z",
      })
    ).toEqual({
      id: "profile-1",
      clerkUserId: "user_1",
      displayName: "Max",
      avatarUrl: "https://example.com/avatar.png",
      createdAt: "2026-07-30T00:00:00Z",
    });
  });

  it("maps nested custom apps, keymaps, sections, shortcuts, and overlays", () => {
    const result = mapCustomizations({
      customApps: [
        {
          id: "app-1",
          user_id: "profile-1",
          slug: "my-app",
          name: "My App",
          bundle_id: "com.example.my-app",
          hostname: null,
          source: null,
          icon: "/icons/my-app.png",
          custom_keymaps: [
            {
              id: "keymap-1",
              custom_app_id: "app-1",
              base_app_slug: null,
              title: "Default",
              platforms: ["macos"],
              custom_sections: [
                {
                  id: "section-1",
                  keymap_id: "keymap-1",
                  title: "General",
                  sort_order: 0,
                  custom_shortcuts: [
                    {
                      id: "shortcut-1",
                      section_id: "section-1",
                      base_app_slug: null,
                      base_keymap_title: null,
                      base_section_title: null,
                      base_shortcut_title: null,
                      base_shortcut_id: null,
                      title: "Open",
                      key: "cmd+o",
                      comment: null,
                      is_deleted: false,
                      sort_order: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      baseKeymaps: [
        {
          id: "keymap-2",
          custom_app_id: null,
          base_app_slug: "safari",
          title: "Default",
          platforms: null,
          custom_sections: [],
        },
      ],
      overlays: [
        {
          id: "overlay-1",
          section_id: null,
          base_app_slug: "safari",
          base_keymap_title: "Default",
          base_section_title: "Tabs",
          base_shortcut_title: "New Tab",
          base_shortcut_id: "stable-id",
          title: "Open a New Tab",
          key: "cmd+t",
          comment: "Customized",
          is_deleted: false,
          sort_order: 0,
        },
      ],
    });

    expect(result.customApps[0]).toMatchObject({
      id: "app-1",
      userId: "profile-1",
      slug: "my-app",
      bundleId: "com.example.my-app",
      hostname: undefined,
    });
    expect(result.customApps[0].keymaps[0].sections[0].shortcuts[0]).toEqual({
      id: "shortcut-1",
      sectionId: "section-1",
      baseAppSlug: undefined,
      baseKeymapTitle: undefined,
      baseSectionTitle: undefined,
      baseShortcutTitle: undefined,
      baseShortcutId: undefined,
      title: "Open",
      key: "cmd+o",
      comment: undefined,
      isDeleted: false,
      keyIsCleared: false,
      commentIsCleared: false,
      sortOrder: 0,
    });
    expect(result.customKeymaps[0]).toMatchObject({
      id: "keymap-2",
      baseAppSlug: "safari",
      title: "Default",
    });
    expect(result.shortcuts).toEqual([
      {
        baseKey: "safari:Default:Tabs:New Tab",
        baseShortcutId: "stable-id",
        modification: {
          id: "overlay-1",
          title: "Open a New Tab",
          key: "cmd+t",
          comment: "Customized",
          isDeleted: false,
          keyIsCleared: false,
          commentIsCleared: false,
        },
      },
    ]);
    expect(result.favorites).toEqual([]);
  });

  it("maps nullable favorite identity fields as undefined", () => {
    expect(
      mapFavorites([
        {
          id: "favorite-1",
          user_id: "profile-1",
          item_type: "shortcut",
          app_slug: "safari",
          keymap_title: "Default",
          section_title: "Tabs",
          shortcut_title: "New Tab",
          base_shortcut_id: null,
          custom_app_id: null,
        },
      ])
    ).toEqual([
      {
        id: "favorite-1",
        userId: "profile-1",
        itemType: "shortcut",
        appSlug: "safari",
        keymapTitle: "Default",
        sectionTitle: "Tabs",
        shortcutTitle: "New Tab",
        baseShortcutId: undefined,
        customAppId: undefined,
      },
    ]);
  });
});

it("maps stable private favorite identities", () => {
  expect(
    mapFavorites([{ id: "f", user_id: "u", item_type: "shortcut", custom_shortcut_id: "s" }])[0].customShortcutId
  ).toBe("s");
  expect(mapFavorites([{ id: "f", user_id: "u", item_type: "keymap", custom_keymap_id: "k" }])[0].customKeymapId).toBe(
    "k"
  );
});
