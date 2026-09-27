// PURE: which source handles which app. Add new sources here.

import type { App, TabSource } from "./model";
import { chromium } from "./sources/chromium";
import { claude } from "./sources/claude";
import { cmux } from "./sources/cmux";
import { ghostty } from "./sources/ghostty";
import { herdr } from "./sources/herdr";
import { iterm } from "./sources/iterm";
import { muse } from "./sources/muse";
import { notion } from "./sources/notion";
import { obsidian } from "./sources/obsidian";
import { safari } from "./sources/safari";
import { terminal } from "./sources/terminal";
import { windows } from "./sources/windows";

export const SOURCES: readonly TabSource[] = [
  chromium,
  safari,
  cmux,
  ghostty,
  iterm,
  terminal,
  claude,
  muse,
  notion,
  obsidian,
];

/** Sources of places inside other apps (TabSource.discover), read alongside every list. */
export const DISCOVERED: readonly TabSource[] = [herdr];

/** The fallback for every app no source claims. */
export const FALLBACK: TabSource = windows;

const byBundleId = new Map(SOURCES.flatMap((s) => s.bundleIds.map((id) => [id, s] as const)));
const byId = new Map([...SOURCES, ...DISCOVERED, FALLBACK].map((s) => [s.id, s]));

export function sourceFor(app: App): TabSource {
  return byBundleId.get(app.bundleId) ?? FALLBACK;
}

export function sourceById(id: string): TabSource | undefined {
  return byId.get(id);
}
