import { afterEach, expect, mock, test } from "bun:test";
import { readFile } from "node:fs/promises";

const getPreferenceValues = mock(() => ({ defaultCompressionFormat: "ZIP", revealInFinder: true }));
const getSelectedFinderItems = mock(async () => [{ path: "/tmp/example.txt" }]);
const showInFinder = mock(async () => undefined);
const showHUD = mock(async () => undefined);
const showToast = mock(() => undefined);
const compress = mock(async () => "/tmp/example.zip");
const ensureBinary = mock(async () => undefined);

mock.module("@raycast/api", () => ({
  getPreferenceValues,
  getSelectedFinderItems,
  showInFinder,
  showHUD,
  showToast,
  Toast: { Style: { Animated: "animated" } },
}));
mock.module("@raycast/utils", () => ({ showFailureToast: mock(() => undefined) }));
mock.module("../src/common/utils", () => ({ compress, ensureBinary }));

afterEach(() => {
  mock.clearAllMocks();
  getPreferenceValues.mockReturnValue({ defaultCompressionFormat: "ZIP", revealInFinder: true });
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
