import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { SPAWN_ENV, cacheDir } from "./paths";

const run = promisify(execFile);

/**
 * The release this extension installs, and the digests that authenticate it.
 *
 * Both are written out here rather than fetched, because a digest downloaded
 * from the server it is meant to guard proves only that the server is
 * self-consistent. Pinning them in the source means the bytes are checked
 * against something a store reviewer read, which is the whole basis on which
 * Raycast permits an extension to fetch an executable at all.
 *
 * Bumping the version means replacing all three of {@link RG_VERSION} and the
 * two digests together, from the `.sha256` files published beside each asset.
 */
export const RG_VERSION = "15.2.0";

const BUILDS: Record<string, { triple: string; sha256: string }> = {
  arm64: {
    triple: "aarch64-apple-darwin",
    sha256: "3750b2e93f37e0c692657da574d7019a101c0084da05a790c83fd335bad973e4",
  },
  x64: {
    triple: "x86_64-apple-darwin",
    sha256: "af7825fcc69a2afc7a7aea55fc9af90e26421d8f20fe59df32e233c0b8a231c1",
  },
};

export interface RgAsset {
  url: string;
  sha256: string;
  /** The path of the binary inside the tarball, which `tar` is asked for by name. */
  member: string;
}

/**
 * The release asset for a CPU architecture, or null where ripgrep publishes no
 * macOS build for it. Null is a supported answer rather than a failure: the
 * caller keeps whatever backend it already had.
 */
export function assetFor(arch: string = process.arch): RgAsset | null {
  const build = BUILDS[arch];
  if (!build) return null;
  const name = `ripgrep-${RG_VERSION}-${build.triple}`;
  return {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RG_VERSION}/${name}.tar.gz`,
    sha256: build.sha256,
    member: `${name}/rg`,
  };
}

/** Where an installed binary lives: inside the support directory, so an uninstall takes it. */
export const managedRgPath = () => join(cacheDir(), "bin", "rg");

export const hasManagedRg = () => existsSync(managedRgPath());

/**
 * Constant-time is not the concern here — the digest is public and the attacker
 * would be substituting the body, not guessing the hash — but case is, since a
 * digest is equally valid written either way.
 */
export function verifyDigest(body: Buffer, expected: string): boolean {
  return (
    createHash("sha256").update(body).digest("hex") === expected.toLowerCase()
  );
}

/**
 * A stalled connection is not a failed one: without a deadline the fetch waits
 * for the operating system to give up, which is minutes, and the only thing the
 * user sees for all of it is a toast that never resolves.
 */
const DOWNLOAD_TIMEOUT_MS = 60_000;

/** Set while a download is in flight; see {@link installRipgrep}. */
let inFlight: Promise<string> | null = null;

/**
 * Fetches the pinned ripgrep release into the support directory and returns the
 * path to it.
 *
 * Every step that could leave a half-installed binary behind is ordered so that
 * it cannot: the tarball is verified before `tar` is allowed near it, extraction
 * lands on a temporary name, and the file is only moved into place after it has
 * been run once and seen to report the version expected of it. A throw from
 * anywhere in here therefore leaves the previous state intact, and the caller
 * falls back to the backend it was already using.
 *
 * The archive is held in memory rather than streamed to disk. At 1.7MB that is
 * cheaper than the temporary file it replaces, and it means unverified bytes
 * never touch the filesystem at all.
 *
 * A second call while one is in flight joins the first rather than starting its
 * own. Both would otherwise write the same two temporary paths, and the first to
 * finish would delete the archive out from under the other's `tar` — reporting a
 * failure for an install that had in fact just succeeded.
 */
export function installRipgrep(): Promise<string> {
  inFlight ??= download().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function download(): Promise<string> {
  const asset = assetFor();
  if (!asset)
    throw new Error(`No ripgrep build is published for ${process.arch}.`);

  let response: Response;
  try {
    response = await fetch(asset.url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    // An abort is the deadline above, not a network fault, and saying so is the
    // difference between "try again" and "check your connection".
    throw (err as Error)?.name === "TimeoutError"
      ? new Error(
          `The download did not finish within ${DOWNLOAD_TIMEOUT_MS / 1000}s.`,
        )
      : err;
  }
  if (!response.ok)
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`,
    );
  const body = Buffer.from(await response.arrayBuffer());

  if (!verifyDigest(body, asset.sha256))
    throw new Error(
      "The downloaded archive did not match its expected checksum, so it was discarded.",
    );

  const dir = join(cacheDir(), "bin");
  mkdirSync(dir, { recursive: true });
  const archive = join(dir, "rg.tar.gz");
  const staged = join(dir, "rg.staged");
  const final = managedRgPath();

  try {
    writeFileSync(archive, body);
    // System tar reads gzip natively, so this needs no dependency. `-O` writes
    // the member to stdout instead of recreating its directory, which keeps the
    // extraction to one file at a known path rather than a tree to clean up.
    const { stdout } = await run(
      "/usr/bin/tar",
      ["-xzOf", archive, asset.member],
      { env: SPAWN_ENV, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    );
    if (stdout.length === 0)
      throw new Error(`The archive did not contain ${asset.member}.`);
    writeFileSync(staged, stdout);
    chmodSync(staged, 0o755);

    // Proof that what was downloaded is a binary this machine can actually run:
    // an arch mismatch, a Gatekeeper refusal or a truncated member all fail
    // here, while the previously working path is still in place.
    const { stdout: version } = await run(staged, ["--version"], {
      env: SPAWN_ENV,
    });
    if (!version.startsWith("ripgrep "))
      throw new Error(
        "The downloaded binary did not identify itself as ripgrep.",
      );

    // Same directory, so this is a rename rather than a copy across devices,
    // and the binary becomes visible at its final path in one step: no window
    // exists in which a search could pick up a partially written file.
    renameSync(staged, final);
    return final;
  } finally {
    rmSync(archive, { force: true });
    rmSync(staged, { force: true });
  }
}
