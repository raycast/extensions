import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { HF_HUB_CACHE_DIR, MODELS_DIR } from "./constants";
import { getCatalogEntry, languageCapabilities, prettifyRepo } from "./catalog";
import { LEGACY_MODELS } from "./legacy-models";

export interface ModelInfo {
  /** Value written to `settings.selected_model` — what Handy loads by. */
  id: string;
  name: string;
  description: string;
  /** GGUF quantisation (e.g. "Q8_0"), when derivable from the filename. */
  quant?: string;
  /** "catalog" = built-in model in the HF cache; "custom" = user-supplied. */
  source: "catalog" | "custom";
  supportsLanguageSelection: boolean;
  supportedLanguages?: string[]; // undefined = no known restriction
}

const GGUF_QUANT = /-(Q\d[0-9A-Z_]*|F16|F32|BF16)\.gguf$/i;

const quantFromFilename = (filename: string): string | undefined => {
  const match = filename.match(GGUF_QUANT);
  return match ? match[1].toUpperCase() : undefined;
};

const isDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** A path that resolves (following symlinks) to a real, present file. */
const isRealFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    // Broken symlink (blob not downloaded) or missing → not present.
    return false;
  }
};

/**
 * Decode an hf-hub cache directory name (`models--org--repo`) back into a repo
 * id (`org/repo`). Returns null for anything that isn't a model cache dir.
 */
const repoIdFromCacheDir = (dirName: string): string | null => {
  if (!dirName.startsWith("models--")) return null;
  return dirName.slice("models--".length).split("--").join("/");
};

/** GGUF files actually present (following symlinks) in a snapshot directory. */
const presentGgufFiles = (snapshotDir: string): string[] =>
  readdirSync(snapshotDir).filter(
    (file) => file.endsWith(".gguf") && isRealFile(join(snapshotDir, file)),
  );

/**
 * Snapshot directories for a cached repo, in resolution priority: the commit
 * pinned by `refs/main` first (when present), then the rest by most-recently
 * modified.
 */
const orderedSnapshotDirs = (repoCacheDir: string): string[] => {
  const snapshotsDir = join(repoCacheDir, "snapshots");
  if (!existsSync(snapshotsDir)) return [];

  const snapshots = readdirSync(snapshotsDir)
    .map((name) => join(snapshotsDir, name))
    .filter(isDirectory)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  const pinned = ((): string | null => {
    const ref = join(repoCacheDir, "refs", "main");
    if (!existsSync(ref)) return null;
    try {
      const dir = join(snapshotsDir, readFileSync(ref, "utf-8").trim());
      return existsSync(dir) ? dir : null;
    } catch {
      return null;
    }
  })();

  return pinned
    ? [pinned, ...snapshots.filter((dir) => dir !== pinned)]
    : snapshots;
};

/**
 * GGUF files from a repo's active snapshot. Walks snapshots in priority order
 * and returns those from the first snapshot that actually has a downloaded
 * GGUF, so a pinned-but-empty `refs/main` snapshot no longer hides a valid
 * model sitting in a later-pulled snapshot of the same repo.
 */
const repoGgufFiles = (repoCacheDir: string): string[] => {
  for (const dir of orderedSnapshotDirs(repoCacheDir)) {
    const ggufFiles = presentGgufFiles(dir);
    if (ggufFiles.length > 0) return ggufFiles;
  }
  return [];
};

/**
 * Discover Handy's built-in models by scanning the HuggingFace hub cache. Each
 * present `.gguf` file becomes a selectable model whose id matches what Handy
 * persists in `selected_model`: `{repo_id}/{filename}`.
 */
export function discoverHfCacheModels(hubDir = HF_HUB_CACHE_DIR): ModelInfo[] {
  if (!existsSync(hubDir)) return [];

  const models: ModelInfo[] = [];
  for (const dirName of readdirSync(hubDir)) {
    const repoId = repoIdFromCacheDir(dirName);
    if (!repoId) continue;

    const ggufFiles = repoGgufFiles(join(hubDir, dirName));
    if (ggufFiles.length === 0) continue;

    const entry = getCatalogEntry(repoId);
    const caps = languageCapabilities(entry);
    for (const filename of ggufFiles) {
      models.push({
        id: `${repoId}/${filename}`,
        name: entry?.name ?? prettifyRepo(repoId),
        description: entry?.description ?? "Downloaded model",
        quant: quantFromFilename(filename),
        source: "catalog",
        ...caps,
      });
    }
  }
  return models;
}

/**
 * Discover user-supplied custom models in Handy's app-support models directory
 * (auto-discovered `.bin` / `.gguf` files and ONNX model folders). Language
 * capabilities are unknown for these, so selection is left open.
 */
export function discoverLegacyDirModels(modelsDir = MODELS_DIR): ModelInfo[] {
  if (!existsSync(modelsDir)) return [];
  let entries: string[];
  try {
    entries = readdirSync(modelsDir);
  } catch {
    return [];
  }
  const present = new Set(entries);

  const models: ModelInfo[] = [];

  // Known built-in models from legacy (pre-transcribe.cpp) Handy builds, keyed
  // by their on-disk filename → restores correct name/id/capabilities.
  for (const legacy of LEGACY_MODELS) {
    if (!present.has(legacy.filename)) continue;
    models.push({
      id: legacy.id,
      name: legacy.name,
      description: legacy.description,
      source: "catalog",
      supportsLanguageSelection: legacy.supportsLanguageSelection,
      supportedLanguages: legacy.supportedLanguages,
    });
  }

  // Anything else in the dir is a user-supplied custom model.
  const knownFilenames = new Set(LEGACY_MODELS.map((m) => m.filename));
  for (const name of entries) {
    if (knownFilenames.has(name)) continue;
    const isDir = isDirectory(join(modelsDir, name));
    if (!isDir && !name.endsWith(".bin") && !name.endsWith(".gguf")) continue;
    models.push({
      id: name,
      name,
      description: "Custom model",
      quant: quantFromFilename(name),
      source: "custom",
      supportsLanguageSelection: true,
    });
  }
  return models;
}

export interface ModelSources {
  hubDir?: string;
  modelsDir?: string;
}

/**
 * All models Handy can currently load, across Handy versions: built-in models
 * from the HuggingFace cache (transcribe.cpp Handy), plus legacy built-in and
 * custom models from the app-support directory (older Handy). Deduped by id.
 */
export function getDownloadedModels({
  hubDir = HF_HUB_CACHE_DIR,
  modelsDir = MODELS_DIR,
}: ModelSources = {}): ModelInfo[] {
  const all = [
    ...discoverHfCacheModels(hubDir),
    ...discoverLegacyDirModels(modelsDir),
  ];
  const seen = new Set<string>();
  return all.filter((model) => {
    if (seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  });
}
