import { ExtensionDef } from "./types";

export const EXTENSION_DEFS: ExtensionDef[] = [
  { ext: "prproj", app: "premiere", label: "Premiere Pro" },
  { ext: "psd", app: "photoshop", label: "Photoshop" },
  { ext: "psb", app: "photoshop", label: "Photoshop (Large)" },
  { ext: "ai", app: "illustrator", label: "Illustrator" },
  { ext: "aep", app: "aftereffects", label: "After Effects" },
];

export const ALL_EXTENSIONS: string[] = EXTENSION_DEFS.map((d) => d.ext);

const BY_EXT = new Map<string, ExtensionDef>(EXTENSION_DEFS.map((d) => [d.ext, d]));

/** Lowercase extension of a path without the dot. "" when there's no extension. */
export function extOf(path: string): string {
  const slash = path.lastIndexOf("/");
  const base = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = base.lastIndexOf(".");
  // dot <= 0 covers "no dot" and dotfiles like ".psd"
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function defForPath(path: string): ExtensionDef | undefined {
  return BY_EXT.get(extOf(path));
}

export function isDesignFile(path: string): boolean {
  return BY_EXT.has(extOf(path));
}
