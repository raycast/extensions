import { environment, showToast, Toast } from "@raycast/api";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

// The Rive and dotLottie web runtimes are NOT bundled with the extension.
// They are downloaded on first run from version-pinned jsDelivr URLs, verified
// against the SHA-256 hashes below, and cached under the extension's support
// directory. After the first successful download the preview works offline.
// To upgrade a runtime, bump the version and replace its hashes.

const RIVE_VERSION = "2.38.0"; // @rive-app/canvas
const DOTLOTTIE_VERSION = "0.74.0"; // @lottiefiles/dotlottie-web
const CDN = "https://cdn.jsdelivr.net/npm";

type Runtime = { name: string; url: string; sha256: string };

const RUNTIMES: Runtime[] = [
  {
    name: "rive.js",
    url: `${CDN}/@rive-app/canvas@${RIVE_VERSION}/rive.js`,
    sha256: "bf4f76f729eac112e3fe2354aeda929b073e585a99b6d0cd1aed99d8fbd51279",
  },
  {
    name: "rive.wasm",
    url: `${CDN}/@rive-app/canvas@${RIVE_VERSION}/rive.wasm`,
    sha256: "5191155725404341497f4d75a3019bab4bb1f6443f31eeab488c83a83586ee6b",
  },
  {
    name: "dotlottie.js",
    url: `${CDN}/@lottiefiles/dotlottie-web@${DOTLOTTIE_VERSION}/dist/index.js`,
    sha256: "8e7b1e9b447971daac84c13d6ce916db0d175240326fc2e19fb6228a14c665b0",
  },
  {
    name: "dotlottie-player.wasm",
    url: `${CDN}/@lottiefiles/dotlottie-web@${DOTLOTTIE_VERSION}/dist/dotlottie-player.wasm`,
    sha256: "a0732c8ff118f058c0bad349ba7e490106fb52770df308455f6bcb1ea0dd104f",
  },
];

// Bumping either version invalidates the cache via this marker, forcing a re-download.
const CACHE_VERSION = `${RIVE_VERSION}_${DOTLOTTIE_VERSION}`;

const libDirectory = join(environment.supportPath, "lib");
const markerFile = join(libDirectory, ".version");

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

const downloadRuntime = async ({ name, url, sha256: expected }: Runtime) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const data = Buffer.from(await response.arrayBuffer());
  if (sha256(data) !== expected) {
    throw new Error(`Checksum mismatch for ${name}`);
  }

  // Write to a temp file first, then rename, so a half-written file is never served.
  const target = join(libDirectory, name);
  const temp = `${target}.download`;
  await writeFile(temp, data);
  await rename(temp, target);
};

// Ensures the cached runtimes exist and match the pinned versions, downloading any
// that are missing or stale. Returns the directory that CONTAINS the `lib/` folder
// (passed to the Swift previewer, which serves `lib/*` from there). Shows a progress
// toast only when a network download is actually needed (first run or a version bump).
export const ensureRuntimes = async (): Promise<string> => {
  const cached = existsSync(markerFile) && (await readFile(markerFile, "utf8")) === CACHE_VERSION;
  if (cached && RUNTIMES.every((r) => existsSync(join(libDirectory, r.name)))) {
    return environment.supportPath;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Setting up preview…",
    message: "Downloading the render runtime. This happens only once.",
  });
  try {
    await mkdir(libDirectory, { recursive: true });
    await Promise.all(RUNTIMES.map(downloadRuntime));
    await writeFile(markerFile, CACHE_VERSION);
  } finally {
    await toast.hide();
  }

  return environment.supportPath;
};
