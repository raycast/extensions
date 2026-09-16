import { afterEach, expect, mock, test } from "bun:test";

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
mock.module("./common/utils", () => ({ compress, ensureBinary }));

afterEach(() => {
  mock.clearAllMocks();
  getPreferenceValues.mockReturnValue({ defaultCompressionFormat: "ZIP", revealInFinder: true });
});

test("reveals the compressed archive when the preference is enabled", async () => {
  const { default: Command } = await import("./quick-compress");

  await Command();

  expect(showInFinder).toHaveBeenCalledWith("/tmp/example.zip");
});

test("does not reveal the compressed archive when the preference is disabled", async () => {
  getPreferenceValues.mockReturnValue({ defaultCompressionFormat: "ZIP", revealInFinder: false });
  const { default: Command } = await import("./quick-compress");

  await Command();

  expect(showInFinder).not.toHaveBeenCalled();
});
