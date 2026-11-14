import { vi } from "vitest";

// @raycast/api only works inside Raycast. Tests get the few pieces the shared code touches.
vi.mock("@raycast/api", () => {
  const names = new Proxy({}, { get: (_, key) => String(key) });
  return {
    getPreferenceValues: () => ({ token: "test-token", mcpUrl: "", dailyJotTag: "" }),
    Color: names,
    Icon: names,
  };
});

vi.mock("@raycast/utils", () => ({
  useLocalStorage: () => ({ value: [], setValue: vi.fn(), isLoading: false }),
}));
