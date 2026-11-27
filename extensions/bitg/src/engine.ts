// SPDX-FileCopyrightText: 2026 dtwinuz and bitg contributors
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { environment, getPreferenceValues } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Core, createCore, FLAG_ASCII_TUTUQ, FLAG_NO_CYRILLIC, FLAG_NO_ENGLISH_GUARD, Target } from "./core";

let core: Promise<Core> | undefined;

export function loadCore(): Promise<Core> {
  core ??= readFile(join(environment.assetsPath, "bitg_core.wasm")).then(createCore);
  core.catch(() => (core = undefined));
  return core;
}

export function preferenceFlags(): number {
  const prefs = getPreferenceValues<Preferences>();
  let flags = 0;
  if (!prefs.keepEnglish) flags |= FLAG_NO_ENGLISH_GUARD;
  if (!prefs.convertCyrillic) flags |= FLAG_NO_CYRILLIC;
  if (prefs.asciiApostrophe) flags |= FLAG_ASCII_TUTUQ;
  return flags;
}

export async function convert(text: string, target: Target = "new"): Promise<string> {
  const c = await loadCore();
  return c.convert(text, target, target === "new" ? preferenceFlags() : 0);
}
