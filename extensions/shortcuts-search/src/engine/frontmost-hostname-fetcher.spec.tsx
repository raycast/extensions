jest.mock("@raycast/api", () => ({ getFrontmostApplication: jest.fn() }), { virtual: true });
jest.mock("@raycast/utils", () => ({ runAppleScript: jest.fn(), runPowerShellScript: jest.fn() }));
jest.mock("../load/platform", () => ({ getPlatform: jest.fn() }));
jest.mock("./windows-hostname-fetcher", () => ({ getWindowsFrontmostBrowserTarget: jest.fn() }));
import { getFrontmostBrowserTarget, getFrontmostHostname } from "./frontmost-hostname-fetcher";
import { runAppleScript } from "@raycast/utils";
import { getPlatform } from "../load/platform";
import { getWindowsFrontmostBrowserTarget } from "./windows-hostname-fetcher";
import { getFrontmostApplication } from "@raycast/api";
import { matchesHostname } from "./hostname-matcher";
import { validateTarget } from "./execution-target";

beforeEach(() => {
  jest.mocked(getFrontmostApplication).mockResolvedValue({ name: "Safari", path: "", bundleId: "com.apple.Safari" });
});

it("matches www catalog aliases without changing the captured macOS URL or host", async () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  const url = "https://www.github.com/user/repo?q=1";
  jest.mocked(runAppleScript).mockResolvedValue(url);
  const target = await getFrontmostBrowserTarget();
  expect(target).toEqual({ kind: "browser", bundleId: "com.apple.Safari", hostname: "www.github.com", url });
  if (!target || target.kind !== "browser") throw new Error("Expected browser target");
  expect(matchesHostname("github.com", target.hostname)).toBe(true);
  expect(() => validateTarget(target)).not.toThrow();
  expect(() => validateTarget({ ...target, hostname: "github.com" })).toThrow("Web page target changed");
});
it("preserves the complete macOS browser target", async () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  jest.mocked(runAppleScript).mockResolvedValue("https://github.com/user/repo");
  expect(await getFrontmostBrowserTarget()).toEqual({
    kind: "browser",
    bundleId: "com.apple.Safari",
    hostname: "github.com",
    url: "https://github.com/user/repo",
  });
  expect(await getFrontmostHostname()).toBe("github.com");
});
it("distinguishes a supported browser without a page from other apps", async () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  jest.mocked(runAppleScript).mockResolvedValue("");
  await expect(getFrontmostBrowserTarget()).rejects.toThrow("The active browser tab has no web page");
  jest.mocked(runAppleScript).mockClear();
  jest.mocked(getFrontmostApplication).mockResolvedValue({ name: "Finder", path: "", bundleId: "com.apple.finder" });
  expect(await getFrontmostBrowserTarget()).toBeNull();
  expect(runAppleScript).not.toHaveBeenCalled();
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
