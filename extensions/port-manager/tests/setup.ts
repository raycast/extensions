import { beforeEach, vi } from "vitest";

// Raycast's native runtime is unavailable in Node. Cache instances share storage as in Raycast.
export const cache = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  Cache: class {
    get(key: string) {
      return cache.get(key);
    }
    set(key: string, value: string) {
      cache.set(key, value);
    }
  },
  Color: { Green: "green", Orange: "orange", Blue: "blue" },
  Action: { Style: { Destructive: "destructive" } },
  Toast: { Style: { Success: "success", Failure: "failure" } },
  showToast: vi.fn(),
  getPreferenceValues: vi.fn(() => ({ killSignal: "ask" })),
}));

vi.mock("@raycast/utils", () => ({ useCachedState: vi.fn() }));

beforeEach(() => cache.clear());
