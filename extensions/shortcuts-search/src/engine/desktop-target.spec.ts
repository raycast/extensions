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
