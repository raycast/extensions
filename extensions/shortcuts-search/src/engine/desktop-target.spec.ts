jest.mock("@raycast/api", () => ({ getApplications: jest.fn() }), { virtual: true });
jest.mock("../load/platform", () => ({ getPlatform: jest.fn() }));
import { getApplications } from "@raycast/api";
import { getPlatform } from "../load/platform";
import { getDesktopTarget } from "./desktop-target";
const app = { name: "Example", slug: "example", keymaps: [] };
it("resolves Windows catalogue process metadata without querying installed apps", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  expect(await getDesktopTarget({ ...app, windowsProcessName: "Example" })).toEqual({
    kind: "desktop",
    windowsProcessName: "Example",
  });
  expect(getApplications).not.toHaveBeenCalled();
});
it("resolves a catalog AUMID to the actual installed executable, rather than interpreting it as a process", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest
    .mocked(getApplications)
    .mockResolvedValue([
      { name: "Example", path: "C:\\Program Files\\Example App.exe", windowsAppId: "Vendor.Package!App" },
    ]);
  expect(await getDesktopTarget({ ...app, windowsAppId: "Vendor.Package!App" })).toEqual({
    kind: "desktop",
    windowsProcessName: "Example App",
  });
});
it("allows installed private apps and metadata-free catalogue entries only with a unique executable match", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest.mocked(getApplications).mockResolvedValue([{ name: "Example", path: "C:\\Example.exe" }]);
  expect(await getDesktopTarget(app)).toEqual({ kind: "desktop", windowsProcessName: "Example" });
  jest.mocked(getApplications).mockResolvedValue([{ name: "Example", path: "Applications" }]);
  expect(await getDesktopTarget(app)).toBeUndefined();
  jest.mocked(getApplications).mockResolvedValue([
    { name: "Example", path: "C:\\Example.exe" },
    { name: "Example", path: "C:\\Other.exe" },
  ]);
  expect(await getDesktopTarget(app)).toBeUndefined();
});
it("preserves macOS bundle targets without querying Windows apps", async () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  expect(await getDesktopTarget({ ...app, bundleId: "com.example.App" })).toEqual({
    kind: "desktop",
    bundleId: "com.example.App",
  });
  expect(getApplications).not.toHaveBeenCalled();
});
it.each([
  { path: "Applications", savedProcess: undefined },
  { path: "Applications", savedProcess: "ExampleOld" },
  { path: "C:\\Start Menu\\Example.lnk", savedProcess: undefined },
  { path: "C:\\Start Menu\\Example.lnk", savedProcess: "ExampleOld" },
])(
  "ignores non-executable duplicates when resolving a unique executable by app ID: %j",
  async ({ path, savedProcess }) => {
    jest.mocked(getPlatform).mockReturnValue("windows");
    jest.mocked(getApplications).mockResolvedValue([
      { name: "Example", path, windowsAppId: "Vendor.Package!App" },
      { name: "Example", path: "C:\\ExampleNew.exe", windowsAppId: "Vendor.Package!App" },
    ]);
    expect(
      await getDesktopTarget({ ...app, windowsAppId: "Vendor.Package!App", windowsProcessName: savedProcess })
    ).toEqual({ kind: "desktop", windowsProcessName: "ExampleNew" });
  }
);
it("resolves the current executable by app ID when a saved process name is stale", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest.mocked(getApplications).mockResolvedValue([
    { name: "Renamed Example", path: "C:\\ExampleNew.exe", windowsAppId: "Vendor.Package!App" },
    { name: "Other App", path: "C:\\ExampleOld.exe", windowsAppId: "Other.Package!App" },
  ]);
  expect(
    await getDesktopTarget({ ...app, windowsAppId: "Vendor.Package!App", windowsProcessName: "ExampleOld" })
  ).toEqual({ kind: "desktop", windowsProcessName: "ExampleNew" });
});
it.each(
  [
    [],
    [{ name: "Example", path: "C:\\Example.exe", windowsAppId: "Other.Package!App" }],
    [{ name: "Example", path: "Applications", windowsAppId: "Vendor.Package!App" }],
    [
      { name: "Example", path: "C:\\Example.exe", windowsAppId: "Vendor.Package!App" },
      { name: "Example", path: "C:\\Other.exe", windowsAppId: "Vendor.Package!App" },
    ],
  ].map((installed) => ({ installed }))
)("does not fall back to a saved process when the stored app ID cannot resolve uniquely: %j", async ({ installed }) => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest.mocked(getApplications).mockResolvedValue(installed);
  expect(
    await getDesktopTarget({ ...app, windowsAppId: "Vendor.Package!App", windowsProcessName: "Example" })
  ).toBeUndefined();
});
