import { Clipboard, getFrontmostApplication, showHUD } from "@raycast/api";
import { getPlatform } from "./load/platform";
import Command from "./current-app";

jest.mock(
  "@raycast/api",
  () => ({ Clipboard: { copy: jest.fn() }, getFrontmostApplication: jest.fn(), showHUD: jest.fn() }),
  { virtual: true }
);
jest.mock("./load/platform", () => ({ getPlatform: jest.fn() }));

it("copies a Windows app ID when available", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest
    .mocked(getFrontmostApplication)
    .mockResolvedValue({ name: "Code", path: "C:\\Code.exe", windowsAppId: "Vendor.Package!App" });
  await Command();
  expect(Clipboard.copy).toHaveBeenCalledWith("Vendor.Package!App");
});

it("copies the executable process name instead of the display name when a Windows ID is missing", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest
    .mocked(getFrontmostApplication)
    .mockResolvedValue({ name: "Visual Studio Code", path: "C:\\Program Files\\Code.exe" });
  await Command();
  expect(Clipboard.copy).toHaveBeenCalledWith("Code");
  expect(showHUD).toHaveBeenCalledWith('Copied Windows process name "Code" (no Windows app ID available)');
});

it("does not copy an unresolvable Windows display name", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  jest.mocked(getFrontmostApplication).mockResolvedValue({ name: "Example", path: "Applications" });
  await Command();
  expect(Clipboard.copy).not.toHaveBeenCalled();
});

it("preserves macOS bundle ID copying", async () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  jest
    .mocked(getFrontmostApplication)
    .mockResolvedValue({ name: "Code", path: "/Applications/Code.app", bundleId: "com.microsoft.VSCode" });
  await Command();
  expect(Clipboard.copy).toHaveBeenCalledWith("com.microsoft.VSCode");
});
