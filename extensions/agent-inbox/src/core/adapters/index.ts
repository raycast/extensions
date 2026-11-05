import { claudeAdapter } from "./claude";
import { codexAdapter } from "./codex";
import { loadManifests, manifestAdapter } from "./custom";
import { Adapter } from "./types";

export const BUILTIN_ADAPTERS: Adapter[] = [claudeAdapter, codexAdapter];

export function allAdapters(): Adapter[] {
  return [...BUILTIN_ADAPTERS, ...loadManifests().map(manifestAdapter)];
}

export function getAdapter(id: string): Adapter | undefined {
  return allAdapters().find((a) => a.id === id);
}

export * from "./types";
