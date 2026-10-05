import type { InstalledApp } from "./apps";

export type Confidence = "high" | "medium" | "low";

export const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export interface Match {
  confidence: Confidence;
  reason: string;
}

/**
 * Words that appear in too many applications' file names to identify one.
 *
 * Matching on these produces the false positives that make naive uninstallers
 * dangerous, so a name token has to survive this list to be used at all.
 */
const GENERIC_TOKENS = new Set([
  "app",
  "apps",
  "beta",
  "browser",
  "client",
  "code",
  "common",
  "core",
  "data",
  "demo",
  "desktop",
  "edit",
  "editor",
  "helper",
  "home",
  "installer",
  "launcher",
  "mail",
  "main",
  "maps",
  "music",
  "news",
  "notes",
  "photos",
  "player",
  "preview",
  "server",
  "shared",
  "support",
  "test",
  "tool",
  "tools",
  "update",
  "updater",
  "user",
  "viewer",
]);

/** Suffixes macOS appends to per-app files, stripped before comparing names. */
const STRIPPABLE_SUFFIXES = [".plist", ".binarycookies", ".savedState", ".bom", ".sfl3", ".sfl2", ".lockfile", ".log"];

const BYHOST_UUID = /\.[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
const TEAM_ID_PREFIX = /^[A-Z0-9]{10}\./;

/** Reduce a directory entry to the identifier an app would have written. */
export function normalizeEntry(entryName: string): string {
  let base = entryName;

  for (const suffix of STRIPPABLE_SUFFIXES) {
    if (base.toLowerCase().endsWith(suffix.toLowerCase())) {
      base = base.slice(0, -suffix.length);
      break;
    }
  }

  base = base.replace(BYHOST_UUID, "");

  // Group containers are prefixed with the developer's ten-character Team ID:
  // `LTZ2PFU5D6.com.bitwarden.desktop`.
  const withoutTeam = base.replace(TEAM_ID_PREFIX, "");
  if (withoutTeam !== base && withoutTeam.includes(".")) {
    base = withoutTeam;
  }

  return base;
}

/** Collapse a name to comparable letters and digits. */
function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface Matcher {
  app: InstalledApp;
  bundleId: string;
  /** `com.bitwarden.` for `com.bitwarden.desktop` — weak, vendor-wide evidence. */
  vendorPrefix: string | null;
  nameTokens: string[];
}

export function buildMatcher(app: InstalledApp): Matcher {
  const bundleId = app.bundleId.toLowerCase();
  const parts = bundleId.split(".");
  const vendorPrefix = parts.length >= 3 ? `${parts.slice(0, 2).join(".")}.` : null;

  const nameTokens = [...new Set([app.name, ...app.aliases].map(squash))].filter(
    (token) => token.length >= 4 && !GENERIC_TOKENS.has(token),
  );

  return { app, bundleId, vendorPrefix, nameTokens };
}

function classifyBase(base: string, matcher: Matcher): Match | null {
  const lower = base.toLowerCase();

  if (lower === matcher.bundleId) {
    return { confidence: "high", reason: "Bundle identifier" };
  }
  if (lower.startsWith(`${matcher.bundleId}.`)) {
    return { confidence: "high", reason: "Bundle identifier (component)" };
  }

  const squashed = squash(base);
  if (matcher.nameTokens.includes(squashed)) {
    return { confidence: "medium", reason: "Application name" };
  }

  if (matcher.vendorPrefix && lower.startsWith(matcher.vendorPrefix)) {
    return { confidence: "low", reason: "Same developer prefix" };
  }
  if (matcher.nameTokens.some((token) => squashed.includes(token))) {
    return { confidence: "low", reason: "Name appears in file name" };
  }

  return null;
}

/**
 * Decide whether `entryName` looks like it belongs to the matcher's app.
 *
 * Only the bundle identifier is treated as strong evidence. A display-name hit
 * is medium, and anything developer-wide or merely containing the name is low
 * and never selected for you.
 *
 * Both the raw entry and its normalized form are tried, because normalization
 * is lossy: stripping `.plist` off `com.example.plist` would otherwise hide a
 * bundle identifier that genuinely ends that way.
 */
export function classify(entryName: string, matcher: Matcher): Match | null {
  // Normalized first, so an exact identifier wins the tie against the same
  // identifier still carrying its extension.
  const forms = [...new Set([normalizeEntry(entryName), entryName])];
  let best: Match | null = null;

  for (const form of forms) {
    const match = classifyBase(form, matcher);
    if (match && (!best || CONFIDENCE_RANK[match.confidence] > CONFIDENCE_RANK[best.confidence])) {
      best = match;
    }
  }

  return best;
}

export interface Attribution {
  match: Match;
  /** Another installed app that claims this entry at least as strongly. */
  conflictsWith?: InstalledApp;
}

/**
 * Attribute an entry to the target app, taking every other installed app into
 * account.
 *
 * If a different app claims the entry more strongly the entry is not ours at
 * all; if it claims it equally, the entry is shared and gets demoted so it is
 * never removed without a deliberate choice.
 */
export function attribute(entryName: string, target: Matcher, others: Matcher[]): Attribution | null {
  const match = classify(entryName, target);
  if (!match) return null;

  let conflict: { matcher: Matcher; match: Match } | null = null;

  for (const other of others) {
    if (other.app.path === target.app.path) continue;
    const otherMatch = classify(entryName, other);
    if (!otherMatch) continue;
    if (CONFIDENCE_RANK[otherMatch.confidence] < CONFIDENCE_RANK[match.confidence]) continue;
    if (!conflict || CONFIDENCE_RANK[otherMatch.confidence] > CONFIDENCE_RANK[conflict.match.confidence]) {
      conflict = { matcher: other, match: otherMatch };
    }
  }

  if (!conflict) return { match };

  if (CONFIDENCE_RANK[conflict.match.confidence] > CONFIDENCE_RANK[match.confidence]) {
    return null;
  }

  return {
    match: { confidence: "low", reason: `Also matches ${conflict.matcher.app.name}` },
    conflictsWith: conflict.matcher.app,
  };
}
