jest.mock("@raycast/api", () => ({ getFrontmostApplication: jest.fn() }), { virtual: true });
jest.mock("@raycast/utils", () => ({ runPowerShellScript: jest.fn() }));
import { getFrontmostApplication } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import { getWindowsFrontmostBrowserTarget } from "./windows-hostname-fetcher";
import { buildWindowsCaptureScript, normalizeBrowserUrl, parseWindowsTarget } from "./windows-target";
it("captures the browser identified by Raycast, using its window root rather than the focused child element", async () => {
  jest.mocked(getFrontmostApplication).mockResolvedValue({ name: "Chrome", path: "C:\\Apps\\chrome.exe" });
  jest.mocked(runPowerShellScript).mockResolvedValue(
    JSON.stringify({
      windowsProcessName: "chrome",
      processId: 123,
      windowHandle: "456",
      url: "https://example.com/path",
      addressValue: "example.com/path",
    })
  );
  expect(await getWindowsFrontmostBrowserTarget()).toEqual({
    kind: "browser",
    windowsProcessName: "chrome",
    processId: 123,
    windowHandle: "456",
    addressValue: "example.com/path",
    documentUrl: "https://example.com/path",
    url: "https://example.com/path",
    hostname: "example.com",
  });
  const script = jest.mocked(runPowerShellScript).mock.calls[0][0];
  expect(script).toContain("::FromHandle($handle)");
  expect(script).toContain("Could not verify the active browser document");
});
it("does not run UI Automation against an unsupported app", async () => {
  jest.mocked(getFrontmostApplication).mockResolvedValue({ name: "Notepad", path: "C:\\notepad.exe" });
  expect(await getWindowsFrontmostBrowserTarget()).toBeNull();
  expect(runPowerShellScript).not.toHaveBeenCalled();
});
it("rejects missing or inconsistent capture data", () => {
  for (const value of [
    {},
    { windowsProcessName: "chrome", processId: 1 },
    { windowsProcessName: "other", processId: 1, windowHandle: "2" },
    { windowsProcessName: "chrome", processId: -1, windowHandle: "2", url: "https://example.com" },
  ]) {
    expect(() => parseWindowsTarget(JSON.stringify(value), "chrome", true)).toThrow();
  }
});
it.each([
  "about:blank",
  "file:///etc/passwd",
  "javascript:alert(1)",
  "search query",
  "https://user:password@example.com",
  "",
])("rejects unverifiable address %s", (url) => {
  expect(() => normalizeBrowserUrl(url)).toThrow();
});
it("retains query/path distinctions and strips www only for matching elsewhere", () => {
  expect(normalizeBrowserUrl("www.example.com/a?q=1")).toBe("https://www.example.com/a?q=1");
  expect(normalizeBrowserUrl("HTTP://example.com/a")).toBe("http://example.com/a");
  expect(buildWindowsCaptureScript("firefox", true)).toContain("Could not verify the browser address bar");
});

it("preserves the exact UIA address value separately from URL canonicalization", () => {
  const addressValue = "https://example.com/%7Euser?q=%41";
  const target = parseWindowsTarget(
    JSON.stringify({ windowsProcessName: "chrome", processId: 1, windowHandle: "2", url: addressValue, addressValue }),
    "chrome",
    true
  );
  expect(target).toMatchObject({ addressValue, url: addressValue });
  expect(buildWindowsCaptureScript("chrome", true)).toContain("$address -and -not $inDocument");
});

it("accepts Windows-correlated pretty and escaped URL representations without losing raw guards", () => {
  const target = parseWindowsTarget(
    JSON.stringify({
      windowsProcessName: "chrome",
      processId: 1,
      windowHandle: "2",
      url: "https://example.com/%7Euser?q=%41",
      addressValue: "example.com/~user?q=A",
    }),
    "chrome",
    true
  );
  expect(target).toMatchObject({
    url: "https://example.com/%7Euser?q=%41",
    documentUrl: "https://example.com/%7Euser?q=%41",
    addressValue: "example.com/~user?q=A",
  });
});
