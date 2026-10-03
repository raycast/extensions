import { findMatchingApp, windowsProcessName } from "./app-matching";
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
  expect(findMatchingApp(apps, { name: "Code", path: "C:\\Program Files\\VS Code\\CODE.EXE" }, "windows")).toBe(
    apps[0]
  );
  expect(
    findMatchingApp(apps, { name: "Code", path: "Applications", windowsAppId: "Microsoft.VisualStudioCode" }, "windows")
  ).toBe(apps[0]);
  expect(
    findMatchingApp(
      apps,
      { name: "Code", path: "/Applications/VS Code.app", bundleId: "com.microsoft.VSCode" },
      "macos"
    )
  ).toBe(apps[0]);
});
it("never matches two missing identifiers or uses names on macOS", () => {
  expect(findMatchingApp(apps, { name: "Unknown", path: "Applications" }, "windows")).toBeUndefined();
  expect(findMatchingApp(apps, { name: "Gmail", path: "Applications" }, "macos")).toBeUndefined();
});
it("permits only unique name fallback and refuses ambiguous process mappings", () => {
  expect(findMatchingApp(apps, { name: "Visual Studio Code", path: "Applications" }, "windows")).toBe(apps[0]);
  expect(
    findMatchingApp(
      [...apps, { ...apps[0], slug: "duplicate" }],
      { name: "Visual Studio Code", path: "C:\\Code.exe" },
      "windows"
    )
  ).toBeUndefined();
});
it("does not confuse AUMIDs, shortcuts, or paths with executable filenames", () => {
  expect(windowsProcessName({ path: "Applications" })).toBeUndefined();
  expect(windowsProcessName({ path: "C:\\Start Menu\\Code.lnk" })).toBeUndefined();
  expect(windowsProcessName({ path: "C:\\Apps\\Adobe XD.exe" })).toBe("Adobe XD");
});
