import type { Platform } from "../../src/lib/tabs/model.ts";

/** A Platform where every call fails unless overridden; records AppleScript calls. */
export function fakePlatform(overrides: Partial<Platform> = {}): Platform & { scripts: string[] } {
  const scripts: string[] = [];
  const unexpected = (name: string) => () => Promise.reject(new Error(`unexpected ${name}`));
  return {
    scripts,
    runAppleScript: async (script) => {
      scripts.push(script);
      return overrides.runAppleScript ? overrides.runAppleScript(script) : "";
    },
    accessibilityTrusted: overrides.accessibilityTrusted ?? (async () => true),
    windows: overrides.windows ?? unexpected("windows"),
    raiseWindow: overrides.raiseWindow ?? unexpected("raiseWindow"),
    sidebarRows: overrides.sidebarRows ?? unexpected("sidebarRows"),
    openSidebarRow: overrides.openSidebarRow ?? unexpected("openSidebarRow"),
    labelWithSuffix: overrides.labelWithSuffix ?? (async () => undefined),
  };
}

export const app = (bundleId: string, name = bundleId) => ({ bundleId, name, path: `/Applications/${name}.app` });
