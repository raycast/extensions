import { findMatchingApps, windowsProcessName } from "./app-matching";
import type { AppMetadata } from "./model/input/input-models";
const apps: AppMetadata[] = [
  {
    name: "Visual Studio Code",
    slug: "vscode",
    bundleId: "com.microsoft.VSCode",
    windowsAppId: "Microsoft.VisualStudioCode",
    windowsProcessName: "Code",
    keymaps: ["Windows"],
  },
  { name: "Gmail", slug: "gmail", hostname: "mail.google.com", keymaps: ["Default"] },
];
it("matches actual native identifiers and executable paths separately", () => {
  expect(findMatchingApps(apps, { name: "Code", path: "C:\\Program Files\\VS Code\\CODE.EXE" }, "windows")).toEqual([
    apps[0],
  ]);
  expect(
    findMatchingApps(
      apps,
      { name: "Code", path: "Applications", windowsAppId: "Microsoft.VisualStudioCode" },
      "windows"
    )
  ).toEqual([apps[0]]);
  expect(
    findMatchingApps(
      apps,
      { name: "Code", path: "/Applications/VS Code.app", bundleId: "com.microsoft.VSCode" },
      "macos"
    )
  ).toEqual([apps[0]]);
});
it("never matches two missing identifiers or uses names on macOS", () => {
  expect(findMatchingApps(apps, { name: "Unknown", path: "Applications" }, "windows")).toEqual([]);
  expect(findMatchingApps(apps, { name: "Gmail", path: "Applications" }, "macos")).toEqual([]);
});
it("returns every matching collection so the caller can ask the user to choose", () => {
  expect(findMatchingApps(apps, { name: "Visual Studio Code", path: "Applications" }, "windows")).toEqual([apps[0]]);
  expect(
    findMatchingApps(
      [...apps, { ...apps[0], slug: "duplicate" }],
      { name: "Visual Studio Code", path: "C:\\Code.exe" },
      "windows"
    )
  ).toEqual([apps[0], { ...apps[0], slug: "duplicate" }]);
});
it("does not confuse AUMIDs, shortcuts, or paths with executable filenames", () => {
  expect(windowsProcessName({ path: "Applications" })).toBeUndefined();
  expect(windowsProcessName({ path: "C:\\Start Menu\\Code.lnk" })).toBeUndefined();
  expect(windowsProcessName({ path: "C:\\Apps\\Adobe XD.exe" })).toBe("Adobe XD");
});
it("offers public and custom macOS collections sharing the current bundle ID", () => {
  const customApp = { ...apps[0], name: "My Editor", slug: "custom-editor" };
  expect(
    findMatchingApps(
      [...apps, customApp],
      { name: "Code", path: "/Applications/VS Code.app", bundleId: apps[0].bundleId },
      "macos"
    )
  ).toEqual([apps[0], customApp]);
});
it.each(["C:\\Code.exe", "C:\\Other.exe"])(
  "excludes conflicting Windows app IDs from process and name fallbacks for %s",
  (path) => {
    const native = { name: apps[0].name, path, windowsAppId: "Another.Editor" };
    expect(findMatchingApps(apps, native, "windows")).toEqual([]);
  }
);
it("does not offer a conflicting-ID collection alongside a matching app with the same process name", () => {
  const customApp = { ...apps[0], name: "My Other Editor", slug: "custom-editor", windowsAppId: "Another.Editor" };
  expect(
    findMatchingApps(
      [...apps, customApp],
      { name: "Code", path: "C:\\Code.exe", windowsAppId: apps[0].windowsAppId },
      "windows"
    )
  ).toEqual([apps[0]]);
});
it("still matches process-only collections when the current application has an ID", () => {
  const processOnly = { ...apps[0], windowsAppId: undefined };
  expect(
    findMatchingApps([processOnly], { name: "Code", path: "C:\\Code.exe", windowsAppId: "Current.Editor" }, "windows")
  ).toEqual([processOnly]);
});
