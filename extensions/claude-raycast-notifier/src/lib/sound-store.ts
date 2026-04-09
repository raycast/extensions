import { environment, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";
import type { SoundSlot } from "./event";

const execFileAsync = promisify(execFile);
const SOUND_SLOTS: SoundSlot[] = [
  "running",
  "needs_input",
  "success",
  "failure",
  "done",
];
const LIBRARY_VERSION = 1;
const MAPPINGS_VERSION = 2;

type SoundKind = "bundled" | "imported";

export type SoundLibraryEntry = {
  id: string;
  label: string;
  kind: SoundKind;
  filename: string;
  frequencyHz?: number;
  durationMs?: number;
  originalName?: string;
};

export type SoundLibrary = {
  version: number;
  sounds: SoundLibraryEntry[];
};

export type SoundMapping = {
  soundId: string | null;
  enabled: boolean;
};

export type SoundMappings = {
  version: number;
  slots: Record<SoundSlot, SoundMapping>;
  hooks: Record<string, SoundMapping>;
};

export type InstallStatus = {
  rootDir: string;
  missing: string[];
  healthy: boolean;
};

type JsonReadResult<T> = {
  value: T;
  malformed: boolean;
};

export async function loadSoundLibrary(): Promise<SoundLibrary> {
  const { libraryFile } = notifierPaths();
  const parsed = await readJsonFile<Partial<SoundLibrary>>(libraryFile, {
    version: LIBRARY_VERSION,
    sounds: [],
  });

  return normalizeLibrary(parsed.value);
}

export async function loadSoundMappings(): Promise<SoundMappings> {
  const { mappingsFile } = notifierPaths();
  const parsed = await readJsonFile<Partial<SoundMappings>>(mappingsFile, {
    version: MAPPINGS_VERSION,
    slots: defaultMappings().slots,
    hooks: {},
  });

  return normalizeMappings(parsed.value);
}

export async function saveSoundMappings(
  mappings: SoundMappings,
): Promise<SoundMappings> {
  const { mappingsFile } = notifierPaths();
  const normalized = normalizeMappings(mappings);
  await writeJsonFile(mappingsFile, normalized);
  return normalized;
}

export async function importSoundFile(
  sourcePath: string,
  label: string,
): Promise<SoundLibraryEntry> {
  const paths = notifierPaths();
  await fs.mkdir(paths.soundsDir, { recursive: true });

  const extension = extname(sourcePath) || ".wav";
  const filename = `${randomUUID()}${extension}`;
  const destination = join(paths.soundsDir, filename);

  await fs.copyFile(sourcePath, destination);

  const entry: SoundLibraryEntry = {
    id: `imported-${randomUUID()}`,
    label,
    kind: "imported",
    filename,
    originalName: basename(sourcePath),
  };

  const library = await loadSoundLibrary();
  await writeJsonFile(paths.libraryFile, {
    version: LIBRARY_VERSION,
    sounds: [...library.sounds, entry],
  });

  return entry;
}

export async function previewSoundFile(filePath: string): Promise<void> {
  try {
    await execFileAsync("afplay", [filePath]);
  } catch (error) {
    const detail =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "Unable to play this audio file";
    throw new Error(detail);
  }
}

export async function repairUserData(): Promise<{
  library: SoundLibrary;
  mappings: SoundMappings;
  status: InstallStatus;
}> {
  const paths = notifierPaths();
  await fs.mkdir(paths.rootDir, { recursive: true });
  await fs.mkdir(paths.soundsDir, { recursive: true });

  const manifest = defaultSoundPack();

  for (const sound of manifest.sounds) {
    const source = resolve(environment.assetsPath, "sounds", sound.filename);
    const destination = join(paths.soundsDir, sound.filename);
    if (!(await pathExists(destination)) && (await pathExists(source))) {
      await fs.copyFile(source, destination);
    }
  }

  const existingLibrary = await loadSoundLibrary();
  const importedSounds = [] as SoundLibraryEntry[];
  for (const sound of existingLibrary.sounds.filter(
    (entry) => entry.kind === "imported",
  )) {
    if (await pathExists(resolveManagedSoundPath(sound.filename))) {
      importedSounds.push(sound);
    }
  }

  const bundledSounds = manifest.sounds.map((sound) => ({
    id: sound.id,
    label: sound.label,
    kind: "bundled" as const,
    filename: sound.filename,
    frequencyHz: sound.frequencyHz,
    durationMs: sound.durationMs,
  }));

  const library = normalizeLibrary({
    version: LIBRARY_VERSION,
    sounds: [...bundledSounds, ...importedSounds],
  });
  await writeJsonFile(paths.libraryFile, library);

  const existingMappings = await loadSoundMappings();
  const manifestDefaults = manifest.defaults ?? {};
  const validSoundIds = new Set(library.sounds.map((sound) => sound.id));
  const mappings = normalizeMappings({
    version: MAPPINGS_VERSION,
    slots: Object.fromEntries(
      SOUND_SLOTS.map((slot) => {
        const current = existingMappings.slots[slot];
        if (current?.soundId && validSoundIds.has(current.soundId)) {
          return [slot, current];
        }
        return [slot, manifestDefaults[slot] ?? defaultMapping()];
      }),
    ) as Record<SoundSlot, SoundMapping>,
    hooks: existingMappings.hooks,
  });
  await writeJsonFile(paths.mappingsFile, mappings);

  return {
    library,
    mappings,
    status: await loadInstallStatus(),
  };
}

export async function loadInstallStatus(): Promise<InstallStatus> {
  const paths = notifierPaths();
  const missing: string[] = [];

  for (const candidate of [
    paths.rootDir,
    paths.soundsDir,
    paths.libraryFile,
    paths.mappingsFile,
  ]) {
    if (!(await pathExists(candidate))) {
      missing.push(candidate);
    }
  }

  if (missing.length === 0) {
    const [libraryRead, mappingsRead] = await Promise.all([
      readJsonFile<Partial<SoundLibrary>>(paths.libraryFile, {
        version: LIBRARY_VERSION,
        sounds: [],
      }),
      readJsonFile<Partial<SoundMappings>>(paths.mappingsFile, {
        version: MAPPINGS_VERSION,
        slots: defaultMappings().slots,
        hooks: {},
      }),
    ]);

    if (libraryRead.malformed) {
      missing.push(`${paths.libraryFile}#malformed`);
    }

    if (mappingsRead.malformed) {
      missing.push(`${paths.mappingsFile}#malformed`);
    }

    const library = normalizeLibrary(libraryRead.value);
    const mappings = normalizeMappings(mappingsRead.value);
    const soundIds = new Set(library.sounds.map((sound) => sound.id));

    for (const sound of library.sounds) {
      const filePath = resolveManagedSoundPath(sound.filename);
      if (!(await pathExists(filePath))) {
        missing.push(filePath);
      }
    }

    for (const slot of SOUND_SLOTS) {
      const mapping = mappings.slots[slot];
      if (mapping.enabled && !mapping.soundId) {
        missing.push(`${paths.mappingsFile}#${slot}:unassigned-enabled`);
        continue;
      }
      if (mapping.soundId && !soundIds.has(mapping.soundId)) {
        missing.push(`${paths.mappingsFile}#${slot}`);
      }
    }

    for (const [hookKey, mapping] of Object.entries(mappings.hooks)) {
      if (mapping.enabled && !mapping.soundId) {
        missing.push(`${paths.mappingsFile}#${hookKey}:unassigned-enabled`);
        continue;
      }
      if (mapping.soundId && !soundIds.has(mapping.soundId)) {
        missing.push(`${paths.mappingsFile}#${hookKey}`);
      }
    }
  }

  return {
    rootDir: paths.rootDir,
    missing,
    healthy: missing.length === 0,
  };
}

export function resolveManagedSoundPath(filename: string): string {
  return join(notifierPaths().soundsDir, filename);
}

function notifierPaths() {
  const preferences = getPreferenceValues<Preferences>();
  const rootDir = expandHome(preferences.notifierRootPath);

  return {
    rootDir,
    soundsDir: join(rootDir, "sounds"),
    libraryFile: join(rootDir, "sound-library.json"),
    mappingsFile: join(rootDir, "sound-mappings.json"),
    stateFile: join(rootDir, "state.json"),
  };
}

function expandHome(path: string): string {
  return path.replace(/^~(?=\/)/, homedir());
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(
  filePath: string,
  fallback: T,
): Promise<JsonReadResult<T>> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    try {
      return {
        value: JSON.parse(raw) as T,
        malformed: false,
      };
    } catch {
      return {
        value: fallback,
        malformed: true,
      };
    }
  } catch {
    return {
      value: fallback,
      malformed: false,
    };
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function normalizeLibrary(
  value: Partial<SoundLibrary> | undefined,
): SoundLibrary {
  return {
    version:
      typeof value?.version === "number" ? value.version : LIBRARY_VERSION,
    sounds: Array.isArray(value?.sounds)
      ? value.sounds.filter(isSoundLibraryEntry)
      : [],
  };
}

function normalizeMappings(
  value: Partial<SoundMappings> | undefined,
): SoundMappings {
  const slots = (value?.slots ?? {}) as Partial<
    Record<SoundSlot, SoundMapping>
  >;
  const hooks = value?.hooks ?? {};

  return {
    version:
      typeof value?.version === "number" ? value.version : MAPPINGS_VERSION,
    slots: Object.fromEntries(
      SOUND_SLOTS.map((slot) => [slot, normalizeMapping(slots[slot])]),
    ) as Record<SoundSlot, SoundMapping>,
    hooks: Object.fromEntries(
      Object.entries(hooks)
        .filter(([hookKey]) => hookKey.length > 0)
        .map(([hookKey, mapping]) => [hookKey, normalizeMapping(mapping)]),
    ),
  };
}

function normalizeMapping(
  value: Partial<SoundMapping> | undefined,
): SoundMapping {
  return {
    soundId: typeof value?.soundId === "string" ? value.soundId : null,
    enabled: Boolean(value?.enabled),
  };
}

function defaultMappings(): SoundMappings {
  const manifest = defaultSoundPack();

  return {
    version: MAPPINGS_VERSION,
    slots: Object.fromEntries(
      SOUND_SLOTS.map((slot) => [
        slot,
        manifest.defaults?.[slot] ?? defaultMapping(),
      ]),
    ) as Record<SoundSlot, SoundMapping>,
    hooks: {},
  };
}

function defaultMapping(): SoundMapping {
  return { soundId: null, enabled: false };
}

function isSoundLibraryEntry(value: unknown): value is SoundLibraryEntry {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    (candidate.kind === "bundled" || candidate.kind === "imported") &&
    typeof candidate.filename === "string"
  );
}

function defaultSoundPack(): DefaultSoundPack {
  return {
    version: LIBRARY_VERSION,
    sounds: [
      {
        id: "focus-bell",
        label: "Focus Bell",
        filename: "focus-bell.wav",
        frequencyHz: 880,
        durationMs: 220,
      },
      {
        id: "claude-ready-to-work",
        label: "Claude Ready To Work",
        filename: "readytowork.mp3",
      },
      {
        id: "soft-alert",
        label: "Soft Alert",
        filename: "soft-alert.wav",
        frequencyHz: 330,
        durationMs: 320,
      },
      {
        id: "gentle-finish",
        label: "Gentle Finish",
        filename: "gentle-finish.wav",
        frequencyHz: 660,
        durationMs: 260,
      },
      {
        id: "claude-jobs-done",
        label: "Claude Jobs Done",
        filename: "jobs_done.mp3",
      },
      {
        id: "bright-success",
        label: "Bright Success",
        filename: "bright-success.wav",
        frequencyHz: 990,
        durationMs: 180,
      },
    ],
    defaults: {
      needs_input: { soundId: "claude-ready-to-work", enabled: true },
      failure: { soundId: "soft-alert", enabled: true },
      done: { soundId: "claude-jobs-done", enabled: true },
      success: { soundId: "bright-success", enabled: false },
      running: { soundId: null, enabled: false },
    },
  };
}

type DefaultSoundPack = {
  version: number;
  sounds: Array<{
    id: string;
    label: string;
    filename: string;
    frequencyHz?: number;
    durationMs?: number;
  }>;
  defaults?: Partial<Record<SoundSlot, SoundMapping>>;
};
