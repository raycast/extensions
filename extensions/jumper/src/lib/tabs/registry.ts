// PURE: which source handles which app. Add new sources here.

import type { App, TabSource } from "./model";
import { chromium } from "./sources/chromium";
import { claude } from "./sources/claude";
import { cmux } from "./sources/cmux";
import { iterm } from "./sources/iterm";
import { muse } from "./sources/muse";
import { safari } from "./sources/safari";
import { terminal } from "./sources/terminal";
import { windows } from "./sources/windows";

export const SOURCES: readonly TabSource[] = [chromium, safari, cmux, iterm, terminal, claude, muse];

/** The fallback for every app no source claims. */
export const FALLBACK: TabSource = windows;

const byBundleId = new Map(SOURCES.flatMap((s) => s.bundleIds.map((id) => [id, s] as const)));
const byId = new Map([...SOURCES, FALLBACK].map((s) => [s.id, s]));

export function sourceFor(app: App): TabSource {
  return byBundleId.get(app.bundleId) ?? FALLBACK;
}

export function sourceById(id: string): TabSource | undefined {
  return byId.get(id);
}
