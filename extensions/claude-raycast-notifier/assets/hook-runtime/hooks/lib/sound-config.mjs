/**
 * sound-config.mjs
 *
 * Shared sound configuration module:
 * - Manages the user's ~/.claude-raycast-notifier data directory
 * - Seeds bundled sounds and default mappings on first install / repair
 * - Provides read/write helpers for sound-library.json and sound-mappings.json
 * - Handles custom sound imports
 */

import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  access,
} from "node:fs/promises";
import { readdirSync } from "node:fs";
import { dirname, join, extname, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Default paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Absolute path to the repo root (two levels up from hooks/lib/) */
const REPO_ROOT = join(__dirname, "..", "..");

const DEFAULT_MANIFEST = join(REPO_ROOT, "config", "default-sound-pack.json");
const DEFAULT_BUNDLED_SOUNDS = join(
  REPO_ROOT,
  "raycast-extension",
  "assets",
  "sounds",
);

/** The fixed set of event slots supported by the notifier. */
export const SLOTS = ["needs_input", "failure", "done", "success", "running"];

// ---------------------------------------------------------------------------
// defaultRootDir
// ---------------------------------------------------------------------------

export function defaultRootDir() {
  return (
    process.env.CLAUDE_NOTIFIER_ROOT ??
    join(homedir(), ".claude-raycast-notifier")
  );
}

// ---------------------------------------------------------------------------
// notifierPaths
// ---------------------------------------------------------------------------

/**
 * Returns an object with absolute paths for every managed artefact under
 * the given root directory.
 *
 * @param {string} rootDir
 */
export function notifierPaths(rootDir = defaultRootDir()) {
  return {
    rootDir,
    soundsDir: join(rootDir, "sounds"),
    requestsDir: join(rootDir, "requests"),
    responsesDir: join(rootDir, "responses"),
    stateFile: join(rootDir, "state.json"),
    libraryFile: join(rootDir, "sound-library.json"),
    mappingsFile: join(rootDir, "sound-mappings.json"),
  };
}

// ---------------------------------------------------------------------------
// Low-level JSON helpers
// ---------------------------------------------------------------------------

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Public read/write helpers
// ---------------------------------------------------------------------------

/**
 * Read the sound library array.  Returns `[]` when the file does not exist.
 *
 * @param {string} [rootDir]
 * @returns {Promise<Array>}
 */
export async function readSoundLibrary(rootDir = defaultRootDir()) {
  const { libraryFile } = notifierPaths(rootDir);
  return readJsonFile(libraryFile, { version: 1, sounds: [] });
}

/**
 * Read the sound mappings object.  Returns `{}` when the file does not exist.
 *
 * @param {string} [rootDir]
 * @returns {Promise<object>}
 */
export async function readSoundMappings(rootDir = defaultRootDir()) {
  const { mappingsFile } = notifierPaths(rootDir);
  return readJsonFile(mappingsFile, {
    version: 2,
    slots: {
      needs_input: { soundId: null, enabled: false },
      failure: { soundId: null, enabled: false },
      done: { soundId: null, enabled: false },
      success: { soundId: null, enabled: false },
      running: { soundId: null, enabled: false },
    },
    hooks: {},
  });
}

/**
 * Persist sound mappings.
 *
 * @param {string} rootDir
 * @param {object} mappings
 */
export async function writeSoundMappings(rootDir, mappings) {
  const { mappingsFile } = notifierPaths(rootDir);
  await writeJsonFile(mappingsFile, mappings);
}

// ---------------------------------------------------------------------------
// ensureUserData — install / repair
// ---------------------------------------------------------------------------

/**
 * Idempotent install / repair helper.
 *
 * - Creates `rootDir/sounds/` if absent
 * - Copies bundled WAV files that are missing
 * - Writes `sound-library.json` if absent (first run) or adds missing entries
 * - Writes `sound-mappings.json` if absent (first run); never overwrites existing
 *
 * @param {object} [opts]
 * @param {string} [opts.rootDir]
 * @param {string} [opts.manifestFile]
 * @param {string} [opts.bundledSoundsDir]
 */
export async function ensureUserData({
  rootDir = defaultRootDir(),
  manifestFile = DEFAULT_MANIFEST,
  bundledSoundsDir = DEFAULT_BUNDLED_SOUNDS,
} = {}) {
  const paths = notifierPaths(rootDir);

  // 1. Ensure directories exist
  await mkdir(paths.soundsDir, { recursive: true });

  // 2. Load the manifest
  const manifest = await readJsonFile(manifestFile, { sounds: [], defaults: {} });

  // 3. Copy any missing bundled sounds
  for (const sound of manifest.sounds) {
    const dest = join(paths.soundsDir, sound.filename);
    const destExists = await access(dest).then(() => true).catch(() => false);
    if (!destExists) {
      const src = join(bundledSoundsDir, sound.filename);
      const srcExists = await access(src).then(() => true).catch(() => false);
      if (srcExists) {
        await copyFile(src, dest);
      }
    }
  }

  // 4. Write sound-library.json — merge missing bundled entries, preserve imports
  const existingLib = await readSoundLibrary(rootDir);
  const existingIds = new Set(existingLib.sounds.map((e) => e.id));
  const newBundled = manifest.sounds
    .filter((s) => !existingIds.has(s.id))
    .map(({ id, label, filename }) => ({ id, label, kind: "bundled", filename }));
  const mergedSounds = [...manifest.sounds.map(({ id, label, filename }) => ({ id, label, kind: "bundled", filename })), ...existingLib.sounds.filter((e) => e.kind === "imported")];
  await writeJsonFile(paths.libraryFile, { version: 1, sounds: mergedSounds });

  // 5. Write sound-mappings.json only if it doesn't already exist (preserve user edits)
  const mappingsExist = await access(paths.mappingsFile).then(() => true).catch(() => false);
  if (!mappingsExist) {
    const slots = {};
    for (const slot of SLOTS) {
      slots[slot] = manifest.defaults?.[slot] ?? { soundId: null, enabled: false };
    }
    await writeJsonFile(paths.mappingsFile, { version: 2, slots, hooks: {} });
  }

  return {
    paths,
    library: await readSoundLibrary(rootDir),
    mappings: await readSoundMappings(rootDir),
  };
}

// ---------------------------------------------------------------------------
// importSound
// ---------------------------------------------------------------------------

/**
 * Copy a custom sound file into the managed sounds directory and register it
 * in `sound-library.json`.
 *
 * @param {string} sourceFile  Absolute path to the source audio file
 * @param {string} label       Human-readable label for the sound
 * @param {object} [opts]
 * @param {string} [opts.rootDir]
 * @returns {Promise<{id: string, label: string, kind: string, filename: string}>}
 */
export async function importSound(
  sourceFile,
  label,
  { rootDir = defaultRootDir() } = {},
) {
  const paths = notifierPaths(rootDir);

  // Ensure sounds directory exists
  await mkdir(paths.soundsDir, { recursive: true });

  const id = `imported-${randomUUID()}`;
  const ext = extname(sourceFile) || ".wav";
  const filename = `${randomUUID()}${ext}`;
  const dest = join(paths.soundsDir, filename);

  await copyFile(sourceFile, dest);

  const entry = { id, label, kind: "imported", filename, originalName: basename(sourceFile) };

  // Append to library
  const library = await readSoundLibrary(rootDir);
  await writeJsonFile(paths.libraryFile, {
    version: library.version,
    sounds: [...library.sounds, entry],
  });

  return entry;
}

// ---------------------------------------------------------------------------
// getInstallStatus
// ---------------------------------------------------------------------------

/**
 * Returns a quick snapshot of whether the user data directory is set up.
 *
 * @param {string} [rootDir]
 * @returns {Promise<{installed: boolean, soundCount: number, mappingCount: number}>}
 */
export async function getInstallStatus(rootDir = defaultRootDir()) {
  const { libraryFile, mappingsFile, soundsDir } = notifierPaths(rootDir);
  const missing = [];

  for (const file of [libraryFile, mappingsFile, soundsDir]) {
    try {
      await access(file);
    } catch {
      missing.push(file);
    }
  }

  return {
    rootDir,
    missing,
    healthy: missing.length === 0,
  };
}
