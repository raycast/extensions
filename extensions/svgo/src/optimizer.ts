import { getPreferenceValues } from "@raycast/api";
import type { PluginConfig } from "svgo";
import { optimizeSvgWithOxvg } from "./oxvg";

// svgo v4 is ESM-only and its css-tree dependency calls `createRequire(import.meta.url)`
// at module load. When Raycast's esbuild bundles that ESM into the CJS output,
// `import.meta.url` becomes `undefined`, so `createRequire(undefined)` throws at load
// time — before any provider is even selected. Loading svgo via `require` makes esbuild
// resolve svgo's (and css-tree's) CJS build, which loads its JSON data with a plain
// `require` and avoids the crash entirely.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { optimize: svgoOptimize } = require("svgo") as typeof import("svgo");

function getProvider(): Preferences["provider"] {
  const { provider } = getPreferenceValues<Preferences>();
  return provider ?? "svgo";
}

export function optimizeSvgWithSvgo(svg: string, plugins: PluginConfig[]): string {
  return svgoOptimize(svg, { plugins }).data;
}

export function optimizeSvg(svg: string, plugins: PluginConfig[]): string {
  const provider = getProvider();

  switch (provider) {
    case "svgo":
      return optimizeSvgWithSvgo(svg, plugins);
    case "oxvg":
      try {
        return optimizeSvgWithOxvg(svg, plugins);
      } catch (error) {
        console.warn("OXVG optimization failed, falling back to SVGO:", error);
        return optimizeSvgWithSvgo(svg, plugins);
      }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown optimization provider: ${_exhaustive}`);
    }
  }
}
