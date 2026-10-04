import type { Application } from "../model/internal/internal-models";
import { Modifiers } from "../model/internal/modifiers";
import type { UserCustomizations } from "./models";
import { ShortcutMerger } from "./shortcut-merger";
import * as platform from "../load/platform";

function baseApplication(): Application {
  return {
    name: "Safari",
    slug: "safari",
    bundleId: "com.apple.Safari",
    keymaps: [
      {
        title: "Default",
        sections: [
          {
            title: "Tabs",
            hotkeys: [
              {
                title: "New Tab",
                sequence: [{ base: "t", modifiers: [Modifiers.command] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

function emptyCustomizations(overrides: Partial<UserCustomizations> = {}): UserCustomizations {
  return {
    customApps: [],
    customKeymaps: [],
    shortcuts: [],
    favorites: [],
    ...overrides,
  };
}

describe("ShortcutMerger", () => {
  it.each(["macos", "windows"] as const)("merges only saved keymaps for %s before matching titles", (current) => {
    const platformMock = jest.spyOn(platform, "getPlatform").mockReturnValue(current);
    const customizations = emptyCustomizations({
      customKeymaps: ["macos", "windows", "all", "none"].map((scope) => ({
        id: scope,
        baseAppSlug: "safari",
        title: "Default",
        platforms: scope === "all" ? undefined : scope === "none" ? [] : [scope],
        sections: [
          {
            id: scope,
            keymapId: scope,
            title: "Personal",
            sortOrder: 0,
            shortcuts: [{ id: scope, title: scope, key: "ctrl+t", isDeleted: false, sortOrder: 0 }],
          },
        ],
      })),
    });
    const base = baseApplication();
    base.keymaps[0].platforms = [current];
    const [merged] = new ShortcutMerger(customizations).mergeShortcuts([base], customizations);
    expect(merged.keymaps[0].platforms).toEqual([current]);
    expect(merged.keymaps[0].sections[1].hotkeys.map((shortcut) => shortcut.title)).toEqual([current, "all"]);
    expect(customizations.customKeymaps).toHaveLength(4);
    platformMock.mockRestore();
  });

  it("adds custom sections and shortcuts to an official application", () => {
    const customizations = emptyCustomizations({
      customKeymaps: [
        {
          id: "keymap-1",
          baseAppSlug: "safari",
          title: "Default",
          sections: [
            {
              id: "section-1",
              keymapId: "keymap-1",
              title: "Personal",
              sortOrder: 0,
              shortcuts: [
                {
                  id: "shortcut-1",
                  sectionId: "section-1",
                  title: "Open Downloads",
                  key: "opt+cmd+l",
                  isDeleted: false,
                  sortOrder: 0,
                },
              ],
            },
          ],
        },
      ],
    });

    const [merged] = new ShortcutMerger(customizations).mergeShortcuts([baseApplication()], customizations);

    expect(merged.keymaps[0].sections[1]).toEqual({
      title: "Personal",
      hotkeys: [
        {
          title: "Open Downloads",
          sequence: [
            {
              base: "l",
              modifiers: ["option down", "command down"],
            },
          ],
          comment: undefined,
          customizationStatus: "created",
          customizationId: "shortcut-1",
          customShortcutId: "shortcut-1",
        },
      ],
    });
  });

  it("applies an identity overlay only to the matching duplicate title", () => {
    const base = baseApplication();
    base.keymaps[0].sections[0].hotkeys.push({
      title: "New Tab",
      sequence: [{ base: "n", modifiers: [Modifiers.command] }],
    });
    const customizations = emptyCustomizations({
      shortcuts: [
        {
          baseKey: "safari:Default:Tabs:New Tab",
          baseShortcutId: '[[["n",["command down"]]],"New Tab","",0]',
          modification: {
            id: "overlay-1",
            title: "New Private Tab",
            key: "shift+cmd+n",
            isDeleted: false,
          },
        },
      ],
    });

    const [merged] = new ShortcutMerger(customizations).mergeShortcuts([base], customizations);

    expect(merged.keymaps[0].sections[0].hotkeys.map((shortcut) => shortcut.title)).toEqual([
      "New Tab",
      "New Private Tab",
    ]);
  });

  it("removes an official shortcut when its overlay is deleted", () => {
    const customizations = emptyCustomizations({
      shortcuts: [
        {
          baseKey: "safari:Default:Tabs:New Tab",
          baseShortcutId: '[[["t",["command down"]]],"New Tab","",0]',
          modification: {
            id: "overlay-1",
            isDeleted: true,
          },
        },
      ],
    });

    const [merged] = new ShortcutMerger(customizations).mergeShortcuts([baseApplication()], customizations);

    expect(merged.keymaps[0].sections[0].hotkeys).toEqual([]);
  });

  it("converts custom applications into runnable Raycast applications", () => {
    const customizations = emptyCustomizations({
      customApps: [
        {
          id: "custom-app-1",
          userId: "profile-1",
          slug: "my-editor",
          name: "My Editor",
          bundleId: "com.example.editor",
          keymaps: [
            {
              id: "keymap-1",
              customAppId: "custom-app-1",
              title: "Default",
              sections: [
                {
                  id: "section-1",
                  keymapId: "keymap-1",
                  title: "Editing",
                  sortOrder: 0,
                  shortcuts: [
                    {
                      id: "shortcut-1",
                      sectionId: "section-1",
                      title: "Format",
                      key: "shift+opt+f",
                      isDeleted: false,
                      sortOrder: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const merged = new ShortcutMerger(customizations).mergeShortcuts([], customizations);

    expect(merged).toEqual([
      {
        name: "My Editor",
        slug: "custom-my-editor",
        customAppId: "custom-app-1",
        bundleId: "com.example.editor",
        hostname: undefined,
        icon: undefined,
        source: undefined,
        keymaps: [
          {
            title: "Default",
            platforms: undefined,
            customKeymapId: "keymap-1",
            sections: [
              {
                title: "Editing",
                hotkeys: [
                  {
                    title: "Format",
                    sequence: [
                      {
                        base: "f",
                        modifiers: ["shift down", "option down"],
                      },
                    ],
                    comment: undefined,
                    customizationStatus: "created",
                    customizationId: "shortcut-1",
                    customShortcutId: "shortcut-1",
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("does not apply a stale legacy overlay when an identity overlay exists", () => {
    const customizations = emptyCustomizations({
      shortcuts: [
        {
          baseKey: "safari:Default:Tabs:New Tab",
          modification: {
            id: "legacy-overlay",
            title: "Legacy title",
            isDeleted: false,
          },
        },
        {
          baseKey: "safari:Default:Tabs:New Tab",
          baseShortcutId: '[[["t",["command down"]]],"New Tab","",0]',
          modification: {
            id: "identity-overlay",
            title: "Identity title",
            isDeleted: false,
          },
        },
      ],
    });

    const [merged] = new ShortcutMerger(customizations).mergeShortcuts([baseApplication()], customizations);

    expect(merged.keymaps[0].sections[0].hotkeys[0].title).toBe("Identity title");
  });
});
