// Where the two halves of the product meet: what you declared, and what is
// actually running. Pure logic, zero I/O — so it is fully testable with
// fabricated situations, which is exactly what its subtlety deserves.

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
