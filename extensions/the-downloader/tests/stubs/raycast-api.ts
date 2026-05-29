// Test stub for `@raycast/api`. The real package ships only TypeScript types
// (its package.json has no `main`/`module`/`exports`), so vite/vitest cannot
// resolve it as a runtime module. vitest.config.ts aliases `@raycast/api` to
// this stub so the unit-tested modules (utils.ts, transcript.ts, …) can be
// imported. It provides just the surface those modules touch at import/use
// time. Extend as more modules come under test.

export const environment = {
  supportPath: "/tmp/the-downloader-test",
  assetsPath: "/tmp/the-downloader-test/assets",
};

const preferences: Record<string, unknown> = {
  downloadPath: "~/Downloads",
  networkIdleTimeoutSec: "120",
};

export function getPreferenceValues<T = Record<string, unknown>>(): T {
  return preferences as T;
}
