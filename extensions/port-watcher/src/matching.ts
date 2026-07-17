// Where the two halves of the product meet: what you declared, and what is
// actually running. Pure logic, zero I/O — so it is fully testable with
// fabricated situations, which is exactly what its subtlety deserves.

import { basename } from "path";
import type { Profile } from "./profiles";
import type { ListeningPort } from "./system";

export interface ProfileMatch {
  status: "running" | "stopped";
  listener?: ListeningPort; // the actual process, when running
  // Stopped, and its declared port is held by someone else. A FACT — we looked,
  // and there it is — not an inference about why.
  //
  // There used to be an `unexpectedPort` flag here too, raised when the live
  // port differed from the declared one, saying "something probably took your
  // port". It rested on an assumption we cannot check: that you declare what the
  // command WILL pick. True of vite, which chooses its own port. False of
  // `python3 -m http.server 8000`, where you set it yourself — there, declaring
  // 5173 alongside made us announce interference that never happened. We cannot
  // tell those two apart from outside, so the inference was unsound and is gone.
  portTakenBy?: ListeningPort;
}

// Matches on the cwd, exactly — never by prefix. The cwd is both the profile's
// identity AND the folder we launch from. A lenient match would show a profile
// as "running" whose Launch button would still fail, because the folder it
// points at has no package.json. One field, two jobs: it must be exact, or one
// of the two lies.
export function matchProfiles(
  profiles: Profile[],
  ports: ListeningPort[],
): { matches: Map<string, ProfileMatch>; orphans: ListeningPort[] } {
  const claimed = new Set<ListeningPort>();
  const matches = new Map<string, ProfileMatch>();

  // Pass 1 — profiles that declare a port get first pick on an exact
  // (cwd, port) hit. Without this ordering a port-less profile sharing the
  // folder could steal the very port a sibling declared (dev + storybook in one
  // repo is the real case).
  for (const profile of profiles) {
    if (!profile.port) continue;
    const hit = ports.find((p) => !claimed.has(p) && p.cwd === profile.cwd && p.port === String(profile.port));
    if (hit) {
      claimed.add(hit);
      matches.set(profile.id, { status: "running", listener: hit });
    }
  }

  // Pass 2 — whatever is left falls back to a cwd-only match. This is what
  // catches the everyday case where vite found 5173 busy and quietly moved to
  // 5174: the folder never lies, the port does.
  for (const profile of profiles) {
    if (matches.has(profile.id)) continue;

    const hit = ports.find((p) => !claimed.has(p) && p.cwd === profile.cwd);
    if (hit) {
      claimed.add(hit);
      matches.set(profile.id, { status: "running", listener: hit });
      continue;
    }

    // Not running. If it declared a port, who is sitting on it? That question is
    // most of the reason this tool exists.
    const squatter = profile.port ? ports.find((p) => p.port === String(profile.port)) : undefined;
    matches.set(profile.id, { status: "stopped", portTakenBy: squatter });
  }

  // Whatever no profile claimed. These are the "create a profile from this"
  // candidates: they are running, and we already know their real cwd.
  return { matches, orphans: ports.filter((p) => !claimed.has(p)) };
}

/* ─── What the search field can find ─── */

// Raycast searches a row's title, subtitle and keywords — nothing else. A
// profile's title is its path and its subtitle is the live port, so typing
// "5173" found a running profile and never a stopped one: the declared port
// lives only in the detail pane, which is not indexed. You would search for the
// port you declared and be told you have no such profile.
//
// So we hand the search every string we already know the row by. Deduped and
// stripped of blanks, because a keyword list is not a place to state that we
// know nothing.
//
// Pure, and here rather than in the UI file for the usual reason: this decides
// what you can find, which is worth pinning.
export function profileKeywords(profile: Profile, match: ProfileMatch | undefined): string[] {
  return keywords([
    basename(profile.cwd),
    profile.port ? String(profile.port) : undefined,
    match?.listener?.port,
    match?.listener?.command,
    // The runner alone ("npm", "vite"): the whole line would drag in noise like
    // flags and paths, and searching "run" would match every profile you own.
    profile.run.trim().split(/\s+/)[0],
  ]);
}

// Same idea for a port nobody declared: the title already carries the port, but
// the folder it runs from is how you actually think of it.
export function listenerKeywords(port: ListeningPort): string[] {
  return keywords([port.port, port.command, port.cwd ? basename(port.cwd) : undefined]);
}

function keywords(candidates: (string | undefined)[]): string[] {
  return [...new Set(candidates.filter((k): k is string => !!k && k.trim() !== ""))];
}
