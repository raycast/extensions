import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { readFile } from "node:fs/promises";

const getPreferenceValues = mock(() => ({ defaultCompressionFormat: "ZIP", revealInFinder: true }));
const getSelectedFinderItems = mock(async () => [{ path: "/tmp/example.txt" }]);
const showInFinder = mock(async () => undefined);
const showHUD = mock(async () => undefined);
const showToast = mock(() => undefined);

mock.module("@raycast/api", () => ({
  environment: { assetsPath: "/tmp", supportPath: "/tmp" },
  getPreferenceValues,
  getSelectedFinderItems,
  showInFinder,
  showHUD,
  showToast,
  Toast: { Style: { Animated: "animated" } },
  Alert: {},
  confirmAlert: () => Promise.resolve(false),
  Icon: {},
  Color: {},
}));
mock.module("@raycast/utils", () => ({ showFailureToast: mock(() => undefined) }));

const utils = await import("../src/common/utils");
const compress = spyOn(utils, "compress").mockImplementation(async () => "/tmp/example.zip");
const ensureBinary = spyOn(utils, "ensureBinary").mockImplementation(async () => undefined);

afterEach(() => {
  mock.clearAllMocks();
  getPreferenceValues.mockReturnValue({ defaultCompressionFormat: "ZIP", revealInFinder: true });
  compress.mockImplementation(async () => "/tmp/example.zip");
  ensureBinary.mockImplementation(async () => undefined);
});

test("reveals the compressed archive when the preference is enabled", async () => {
  const { default: Command } = await import("../src/quick-compress");

  await Command();

  expect(showInFinder).toHaveBeenCalledWith("/tmp/example.zip");
});

test("does not reveal the compressed archive when the preference is disabled", async () => {
  getPreferenceValues.mockReturnValue({ defaultCompressionFormat: "ZIP", revealInFinder: false });
  const { default: Command } = await import("../src/quick-compress");

  await Command();

  expect(showInFinder).not.toHaveBeenCalled();
});

test("normalizes folder paths by removing trailing slash before compressing", async () => {
  getSelectedFinderItems.mockResolvedValueOnce([{ path: "/tmp/my-folder/" }]);
  const { default: Command } = await import("../src/quick-compress");

  await Command();

  expect(compress).toHaveBeenCalledWith(["/tmp/my-folder"], "ZIP");
});

test("declares the Finder reveal preference in Archiver settings", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const quickCompress = manifest.commands.find((command: { name: string }) => command.name === "quick-compress");
  const compress = manifest.commands.find((command: { name: string }) => command.name === "compress");

  expect(manifest.preferences.some((preference: { name: string }) => preference.name === "revealInFinder")).toBe(true);
  expect(quickCompress.preferences.some((preference: { name: string }) => preference.name === "revealInFinder")).toBe(
    false,
  );
  expect(compress.preferences.some((preference: { name: string }) => preference.name === "revealInFinder")).toBe(false);
});
