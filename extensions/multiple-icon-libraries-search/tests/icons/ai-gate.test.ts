// Raycast AI comes with Raycast Pro. Without it, no AI call goes out and the search bar doesn't promise
// search by meaning. These tests fail if the canAccess(AI) check is removed.
import { beforeEach, describe, expect, it, vi } from "vitest";
// vi.mock below is hoisted above these imports, so they load the mocked Raycast API.
import { aiKeywordsFor, canUseRaycastAi } from "../../src/icons/hooks";
import { searchPlaceholder } from "../../src/icons/libraries";

const raycast = vi.hoisted(() => ({ canAccessAi: false, ask: vi.fn(async () => "smile, happy, emoji") }));

vi.mock("@raycast/api", () => {
  const store = new Map<string, string>();
  return {
    AI: { ask: raycast.ask },
    Cache: class {
      get = (key: string) => store.get(key);
      set = (key: string, value: string) => void store.set(key, value);
    },
    environment: {
      canAccess: () => raycast.canAccessAi,
      supportPath: "/nonexistent",
      assetsPath: "/nonexistent",
    },
    Icon: {},
    LocalStorage: { getItem: async () => undefined, setItem: async () => undefined, removeItem: async () => undefined },
    showToast: async () => ({}),
    Toast: { Style: {} },
  };
});

beforeEach(() => raycast.ask.mockClear());

describe("without Raycast Pro (no Raycast AI)", () => {
  beforeEach(() => {
    raycast.canAccessAi = false;
  });

  it("asks Raycast AI nothing, for automatic searches or Tab", async () => {
    expect(canUseRaycastAi()).toBe(false);
    const signal = new AbortController().signal;
    expect(await aiKeywordsFor("happy face", "auto", "default", signal)).toBeUndefined();
    expect(await aiKeywordsFor("happy face", "tab", "default", signal)).toBeUndefined();
    expect(raycast.ask).not.toHaveBeenCalled();
  });

  it("doesn't promise search by meaning in the search bar", () => {
    expect(searchPlaceholder("lucide", canUseRaycastAi())).toBe("Search Lucide icons…");
    expect(searchPlaceholder("hugeicons", canUseRaycastAi())).toBe("Search free Hugeicons…");
  });
});

describe("with Raycast AI", () => {
  beforeEach(() => {
    raycast.canAccessAi = true;
  });

  it("asks once, then answers the same search from the cache", async () => {
    const signal = new AbortController().signal;
    const first = await aiKeywordsFor("happy face", "tab", "default", signal);
    expect(first).toMatchObject({ status: "done", keywords: ["smile", "happy", "emoji"] });
    expect(await aiKeywordsFor("Happy face", "auto", "default", signal)).toMatchObject({ status: "done" });
    expect(raycast.ask).toHaveBeenCalledTimes(1);
  });

  it("says search by meaning works", () => {
    expect(searchPlaceholder("lucide", canUseRaycastAi())).toBe("Search Lucide by name or meaning…");
  });
});
