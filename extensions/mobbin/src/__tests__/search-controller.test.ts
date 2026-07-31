import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobbinSearchController } from "../lib/search-controller";
import { clearSearchCache } from "../lib/search-cache";
import type {
  ScreenReference,
  SearchClient,
  SearchOptions,
} from "../lib/types";

const options: SearchOptions = {
  kind: "screen",
  query: "login",
  platform: "ios",
  mode: "deep",
  imageQuality: "optimized",
  mcpImageFormat: "webp",
  limit: 20,
  excludeScreenIds: [],
};
const screen: ScreenReference = {
  kind: "screen",
  id: "screen-1",
  title: "Login",
  appName: "Example",
  platform: "ios",
  source: "api",
  mobbinUrl: "https://mobbin.com/screen-1",
  image: { url: "https://example.com/screen.webp" },
};

function clientWith(search: SearchClient["search"]): SearchClient {
  return {
    connect: vi.fn(),
    getCapabilities: vi.fn(),
    search,
    dispose: vi.fn(),
  };
}

describe("MobbinSearchController", () => {
  beforeEach(() => {
    clearSearchCache();
    vi.useFakeTimers();
  });

  it("uses exactly one 700 ms debounce", async () => {
    const search = vi.fn(async () => [screen]);
    const states: unknown[] = [];
    const controller = new MobbinSearchController({
      client: clientWith(search),
      authMode: "api-key",
      onStateChange: (state) => states.push(state),
      onCompleted: vi.fn(),
    });

    controller.update(options);
    await vi.advanceTimersByTimeAsync(699);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(states).toContainEqual({
      results: [screen],
      isLoading: false,
    });
  });

  it("cancels superseded work and suppresses stale results/history", async () => {
    const resolutions: Array<(value: ScreenReference[]) => void> = [];
    const signals: AbortSignal[] = [];
    const search = vi.fn(
      (_options: SearchOptions, signal?: AbortSignal) =>
        new Promise<ScreenReference[]>((resolve) => {
          resolutions.push(resolve);
          if (signal) signals.push(signal);
        }),
    );
    const onCompleted = vi.fn();
    const states: Array<{ results: ScreenReference[] }> = [];
    const controller = new MobbinSearchController({
      client: clientWith(search),
      authMode: "api-key",
      onStateChange: (state) =>
        states.push({ results: state.results as ScreenReference[] }),
      onCompleted,
    });

    controller.update(options);
    await vi.advanceTimersByTimeAsync(700);
    controller.update({ ...options, query: "checkout" });
    await Promise.resolve();
    expect(signals[0]?.aborted).toBe(true);
    resolutions[0]?.([screen]);
    await Promise.resolve();
    expect(onCompleted).not.toHaveBeenCalled();
    expect(states.at(-1)?.results).toEqual([]);

    await vi.advanceTimersByTimeAsync(700);
    resolutions[1]?.([{ ...screen, id: "screen-2" }]);
    await vi.runAllTimersAsync();
    expect(onCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ query: "checkout" }),
      expect.any(AbortSignal),
    );
    expect(states.at(-1)?.results).toEqual([
      expect.objectContaining({ id: "screen-2" }),
    ]);
  });

  it("validates before scheduling network work", async () => {
    const search = vi.fn(async () => [screen]);
    const states: Array<{ error?: Error }> = [];
    const controller = new MobbinSearchController({
      client: clientWith(search),
      authMode: "api-key",
      onStateChange: (state) => states.push(state),
      onCompleted: vi.fn(),
    });
    controller.update({ ...options, query: "x".repeat(501) });
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(states.at(-1)?.error).toMatchObject({
      name: "MobbinError",
      code: "invalid-query",
    });
  });
});
