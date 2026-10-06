import { getApplications } from "@raycast/api";
import { findMatchingApps } from "../app-matching";
import { getDesktopTarget } from "../engine/desktop-target";
import { validateTarget } from "../engine/execution-target";
import { mapCustomizations } from "./mappers";
import { ShortcutMerger } from "./shortcut-merger";
import { mergeAppMetadata } from "./view-models";

jest.mock("@raycast/api", () => ({ getApplications: jest.fn() }), { virtual: true });
jest.mock("../load/platform", () => ({ getPlatform: () => "windows" }));

const installed = {
  name: "Visual Studio Code",
  windowsAppId: "Vendor.Package!App",
  path: "C:\\Program Files\\Code.exe",
};
function storedApp(windows: Record<string, string | null | undefined> = {}) {
  return {
    id: "custom-app",
    user_id: "profile",
    name: "My Editor",
    slug: "my-editor",
    bundle_id: "com.microsoft.VSCode",
    ...windows,
    custom_keymaps: [
      {
        id: "keys",
        title: "Default",
        platforms: ["windows"],
        custom_sections: [
          {
            id: "section",
            keymap_id: "keys",
            title: "Edit",
            sort_order: 0,
            custom_shortcuts: [{ id: "shortcut", title: "Copy", key: "ctrl+c", is_deleted: false, sort_order: 0 }],
          },
        ],
      },
    ],
  };
}

it.each([
  { windows_app_id: installed.windowsAppId, windows_process_name: "Code" },
  { windows_app_id: installed.windowsAppId, windows_process_name: "OldCode" },
  { windows_app_id: installed.windowsAppId, windows_process_name: null },
  { windows_app_id: null, windows_process_name: "Code" },
])("resolves renamed custom apps from persisted Windows identifiers %j", async (windows) => {
  jest.mocked(getApplications).mockResolvedValue([installed]);
  const data = mapCustomizations({ customApps: [storedApp(windows)], baseKeymaps: [], overlays: [] });
  const publicApp = { name: "Visual Studio Code", slug: "vscode", windowsProcessName: "Code", keymaps: ["Default"] };
  const metadata = mergeAppMetadata([publicApp], data, "windows");
  expect(findMatchingApps(metadata, installed, "windows").map((app) => app.slug)).toEqual([
    "vscode",
    "custom-my-editor",
  ]);
  const [app] = new ShortcutMerger(data).mergeShortcuts([], data);
  const target = await getDesktopTarget(app);
  expect(app.name).toBe("My Editor");
  expect(app.windowsAppId).toBe(windows.windows_app_id ?? undefined);
  expect(app.windowsProcessName).toBe(windows.windows_process_name ?? undefined);
  expect(target).toEqual({ kind: "desktop", windowsProcessName: "Code" });
  expect(() => validateTarget(target!)).not.toThrow();
});

it.each([{}, { windows_app_id: null, windows_process_name: null }])(
  "keeps legacy and cleared custom apps readable without guessing renamed targets %j",
  async (windows) => {
    jest.mocked(getApplications).mockResolvedValue([installed]);
    const data = mapCustomizations({ customApps: [storedApp(windows)], baseKeymaps: [], overlays: [] });
    const [app] = new ShortcutMerger(data).mergeShortcuts([], data);
    expect(app.bundleId).toBe("com.microsoft.VSCode");
    expect(app.windowsAppId).toBeUndefined();
    expect(app.windowsProcessName).toBeUndefined();
    expect(await getDesktopTarget(app)).toBeUndefined();
  }
);

it("rejects ambiguous installed IDs instead of selecting an executable", async () => {
  jest.mocked(getApplications).mockResolvedValue([installed, { ...installed, path: "C:\\Other\\Code.exe" }]);
  const data = mapCustomizations({
    customApps: [storedApp({ windows_app_id: installed.windowsAppId })],
    baseKeymaps: [],
    overlays: [],
  });
  expect(await getDesktopTarget(new ShortcutMerger(data).mergeShortcuts([], data)[0])).toBeUndefined();
});
