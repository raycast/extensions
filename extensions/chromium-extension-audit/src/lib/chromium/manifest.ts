import { Dict, canonical, object, strings, unique } from "../json";
import { Extension } from "../model";
import { normalizePatterns } from "../permissions/patterns";

export function normalizedManifest(manifest: Dict): string {
  const normalized = { ...manifest };
  for (const key of ["permissions", "optional_permissions", "host_permissions", "optional_host_permissions"]) {
    if (Array.isArray(manifest[key]))
      normalized[key] = strings(manifest[key]).map((value) =>
        value === "<all_urls>" || value.includes("://") ? normalizePatterns([value])[0] : value,
      );
  }
  return canonical(normalized);
}

export function contentScriptDeclarations(manifest: Dict): Extension["contentScripts"] {
  return (Array.isArray(manifest.content_scripts) ? manifest.content_scripts : []).flatMap((value) => {
    const script = object(value);
    if (!script) return [];
    return [
      {
        matches: normalizePatterns(strings(script.matches), true),
        excludeMatches: normalizePatterns(strings(script.exclude_matches), true),
        includeGlobs: unique(strings(script.include_globs)),
        excludeGlobs: unique(strings(script.exclude_globs)),
        js: strings(script.js),
        css: strings(script.css),
        allFrames: script.all_frames === true,
        matchAboutBlank: script.match_about_blank === true,
        matchOriginAsFallback: script.match_origin_as_fallback === true,
        runAt: typeof script.run_at === "string" ? script.run_at : "document_idle",
        world: typeof script.world === "string" ? script.world : "ISOLATED",
      },
    ];
  });
}

const host = (value: unknown) => {
  if (typeof value !== "string") return "unknown URL";
  try {
    return new URL(value).host || value.slice(0, 120);
  } catch {
    return value.slice(0, 120);
  }
};
// chrome_settings_overrides apply without a permission prompt, so they are recorded separately from permissions.
export function settingsOverrides(manifest: Dict): string[] {
  const overrides = object(manifest.chrome_settings_overrides);
  if (!overrides) return [];
  const search = object(overrides.search_provider);
  return unique([
    ...(search ? [`Search provider: ${host(search.search_url)}${search.is_default === true ? " (default)" : ""}`] : []),
    ...(overrides.homepage !== undefined ? [`Homepage: ${host(overrides.homepage)}`] : []),
    ...strings(overrides.startup_pages).map((page) => `Startup page: ${host(page)}`),
  ]);
}
const pages: Record<string, string> = { newtab: "New tab page", history: "History page", bookmarks: "Bookmarks page" };
export function pageOverrides(manifest: Dict): string[] {
  const overrides = object(manifest.chrome_url_overrides);
  return overrides
    ? unique(
        Object.keys(pages)
          .filter((key) => typeof overrides[key] === "string")
          .map((key) => pages[key]),
      )
    : [];
}
