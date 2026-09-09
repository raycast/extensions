export interface Profile {
  guid: string;
  name: string;
  hidden?: boolean;
  source?: string;
  commandline?: string;
}

export interface NewTabMenuEntry {
  type: string;
  profile?: string;
  name?: string;
  commandline?: string;
  source?: string;
  entries?: NewTabMenuEntry[];
}

// JavaScript regex matching can't be interrupted once it starts, so an exponentially
// backtracking pattern — (a+)+, (a|aa)*, ((ab)+)+ — would freeze the profile list while it
// renders. Every such pattern quantifies a group that itself repeats or alternates, so reject
// that shape up front. Conservative: a harmless pattern like (a|b)+ is rejected too, which
// costs one unmatched menu entry instead of a hung command.
function hasRiskyBacktracking(pattern: string): boolean {
  // Escapes and character classes can't open a group, so reduce them to a plain character first.
  let rest = pattern.replace(/\\./g, "a").replace(/\[[^\]]*\]/g, "a");
  const innermostGroup = /\(([^()]*)\)(\*|\+|\?|\{\d+(?:,\d*)?\})?/;

  // Collapse groups from the inside out. A group that repeats collapses to "a+" so an enclosing
  // quantifier still sees a repeat inside it; anything else collapses to a plain "a".
  for (let match = innermostGroup.exec(rest); match; match = innermostGroup.exec(rest)) {
    const [whole, body, quantifier] = match;
    const repeats = quantifier !== undefined && quantifier !== "?";
    if (repeats && /[*+|]|\{\d*,\d*\}/.test(body)) return true;
    rest = rest.replace(whole, repeats ? "a+" : "a");
  }

  return false;
}

// A matchProfiles entry matches a profile when ANY provided field (name/commandline/source)
// fully matches that field's regex — mirrors Windows Terminal's MatchProfilesEntry. Empty profile
// fields never match, so "source": ".*" skips local profiles and "commandline": ".*" skips
// profiles without a command line. An entry with no patterns, or a malformed or exponentially
// backtracking regex, matches nothing rather than crashing, hanging, or matching all.
export function buildProfileMatcher(entry: NewTabMenuEntry): ((profile: Profile) => boolean) | null {
  const specs: { pattern: string; get: (profile: Profile) => string }[] = [];
  if (entry.name !== undefined) specs.push({ pattern: entry.name, get: (p) => p.name });
  if (entry.commandline !== undefined) specs.push({ pattern: entry.commandline, get: (p) => p.commandline ?? "" });
  if (entry.source !== undefined) specs.push({ pattern: entry.source, get: (p) => p.source ?? "" });
  if (specs.length === 0) return null;
  if (specs.some(({ pattern }) => hasRiskyBacktracking(pattern))) return null;

  let matchers: { regex: RegExp; get: (profile: Profile) => string }[];
  try {
    matchers = specs.map(({ pattern, get }) => ({ regex: new RegExp(`^(?:${pattern})$`), get }));
  } catch {
    return null;
  }

  return (profile: Profile) =>
    matchers.some(({ regex, get }) => {
      const value = get(profile);
      return value.length > 0 && regex.test(value);
    });
}

// Mirrors Windows Terminal's own newTabMenu resolution (CascadiaSettingsSerialization.cpp):
// two passes over the tree. Pass 1 collects every profile referenced by a "profile" or
// "matchProfiles" entry anywhere (including inside folders). Pass 2 walks the tree again to
// build the final order — "remainingProfiles" expands to profiles NOT in that pass-1 set, at
// the position it appears, so a later explicit reference still lands after the remainder.
export function resolveNewTabMenuOrder(profiles: Profile[], newTabMenu: NewTabMenuEntry[]): string[] {
  const referenced = new Set<string>();

  function collectReferenced(entries: NewTabMenuEntry[]) {
    for (const entry of entries) {
      if (entry.type === "profile" && entry.profile) {
        const match = profiles.find((p) => p.guid === entry.profile || p.name === entry.profile);
        if (match) referenced.add(match.guid);
      } else if (entry.type === "matchProfiles") {
        const matcher = buildProfileMatcher(entry);
        if (matcher) profiles.forEach((p) => matcher(p) && referenced.add(p.guid));
      } else if (entry.type === "folder" && entry.entries) {
        collectReferenced(entry.entries);
      }
    }
  }
  collectReferenced(newTabMenu);

  const order: string[] = [];
  const placed = new Set<string>();
  function addGuid(guid: string) {
    if (placed.has(guid)) return;
    placed.add(guid);
    order.push(guid);
  }

  function build(entries: NewTabMenuEntry[]) {
    for (const entry of entries) {
      if (entry.type === "profile" && entry.profile) {
        const match = profiles.find((p) => p.guid === entry.profile || p.name === entry.profile);
        if (match) addGuid(match.guid);
      } else if (entry.type === "matchProfiles") {
        const matcher = buildProfileMatcher(entry);
        if (matcher) profiles.forEach((p) => matcher(p) && addGuid(p.guid));
      } else if (entry.type === "folder" && entry.entries) {
        build(entry.entries);
      } else if (entry.type === "remainingProfiles") {
        profiles.forEach((p) => !referenced.has(p.guid) && addGuid(p.guid));
      }
    }
  }
  build(newTabMenu);

  return order;
}
