jest.mock("@raycast/api", () => ({ getFrontmostApplication: jest.fn() }), { virtual: true });
jest.mock("@raycast/utils", () => ({ runAppleScript: jest.fn(), runPowerShellScript: jest.fn() }));
jest.mock("../load/platform", () => ({ getPlatform: jest.fn() }));
jest.mock("./windows-hostname-fetcher", () => ({ getWindowsFrontmostBrowserTarget: jest.fn() }));
import { getFrontmostBrowserTarget, getFrontmostHostname } from "./frontmost-hostname-fetcher";
import { runAppleScript } from "@raycast/utils";
import { getPlatform } from "../load/platform";
import { getWindowsFrontmostBrowserTarget } from "./windows-hostname-fetcher";
it("preserves the complete macOS browser target", async () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  jest
    .mocked(runAppleScript)
    .mockResolvedValue(JSON.stringify({ bundleId: "com.apple.Safari", url: "https://github.com/user/repo" }));
  expect(await getFrontmostBrowserTarget()).toEqual({
    kind: "browser",
    bundleId: "com.apple.Safari",
    hostname: "github.com",
    url: "https://github.com/user/repo",
  });
  expect(await getFrontmostHostname()).toBe("github.com");
});
it("dispatches Windows capture without calling AppleScript", async () => {
  jest.mocked(getPlatform).mockReturnValue("windows");
  const target = {
    kind: "browser" as const,
    windowsProcessName: "chrome",
    processId: 123,
    windowHandle: "456",
    hostname: "example.com",
    addressValue: "https://example.com/",
    documentUrl: "https://example.com/",
    url: "https://example.com/",
  };
  jest.mocked(getWindowsFrontmostBrowserTarget).mockResolvedValue(target);
  expect(await getFrontmostBrowserTarget()).toEqual(target);
  expect(runAppleScript).not.toHaveBeenCalled();
});
