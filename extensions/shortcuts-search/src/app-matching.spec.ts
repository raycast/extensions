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
