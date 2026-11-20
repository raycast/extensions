import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

/**
 * Locations Spotipy persists the OAuth token cache. spotDL writes to one of
 * these depending on the XDG config setup; we wipe both to be safe.
 */
function cachePaths(home: string): string[] {
  return [path.join(home, ".spotdl", ".spotipy"), path.join(home, ".config", "spotdl", ".spotipy")];
}

function fingerprintFile(supportDir: string): string {
  return path.join(supportDir, "spotdl-creds.fingerprint");
}

function fingerprintOf(clientId: string, clientSecret: string, userAuth: boolean): string {
  // Newline delimiter, not a space: credentials never contain newlines, so
  // ("a b", "c") and ("a", "b c") can't collide to the same fingerprint. (A
  // literal NUL works too but makes Git treat this source file as binary.)
  return crypto
    .createHash("sha256")
    .update([clientId, clientSecret, userAuth ? "u" : "c"].join("\n"))
    .digest("hex");
}

/**
 * Wipe spotDL's cached OAuth token when the active credential set changed since
 * the previous run. Spotipy keys its cache by filename only — it has no idea
 * the cached token belongs to a different Client ID — so a stale token is
 * silently reused and the new credentials look broken (spotDL upstream #2606).
 * Detect a change via a sha256 fingerprint stored in `supportDir` and unlink
 * the cache file(s) when it differs. Best-effort: any I/O error is swallowed
 * so a quirky filesystem can't block a download.
 */
export function invalidateSpotipyCacheIfStale(
  supportDir: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
  userAuth: boolean,
  home: string = os.homedir(),
): void {
  if (!clientId || !clientSecret) return;
  const current = fingerprintOf(clientId, clientSecret, userAuth);
  const fpFile = fingerprintFile(supportDir);
  let previous = "";
  try {
    previous = fs.readFileSync(fpFile, "utf8").trim();
  } catch {
    /* no prior fingerprint — treat as changed */
  }
  if (previous === current) return;
  for (const cachePath of cachePaths(home)) {
    try {
      fs.unlinkSync(cachePath);
    } catch {
      /* not present — fine */
    }
  }
  try {
    fs.mkdirSync(supportDir, { recursive: true });
    fs.writeFileSync(fpFile, current);
  } catch {
    /* persistence failed — we'll re-clear next run, harmless */
  }
}
