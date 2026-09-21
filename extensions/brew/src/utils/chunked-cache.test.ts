/**
 * The chunked cache builder, exercised against the REAL formula.json.
 *
 * A build that drops records, or that misnumbers a chunk offset, still produces
 * a cache that LOOKS usable: the index loads, the list renders, and only the
 * wrong package appears behind the wrong row. Nothing in a type check or a
 * render catches it, which is why the round-trip is asserted here against real
 * data rather than a fixture.
 *
 * Skips itself when the real download is not on disk, so it never fails CI for
 * a missing fixture — a 32MB file does not belong in the repo.
 */

import { describe, expect, it } from "vitest";
import path from "path";
import os from "os";
import { mkdtemp, rm, stat } from "fs/promises";
import { buildChunkedCache, loadIndex, loadItemsFromChunks } from "./cache";
import { compactCaskArtifacts } from "./brew/link";
import type { CaskArtifact, ChunkedCacheConfig, IndexEntry } from "./types";

const SOURCE_URL = "https://formulae.brew.sh/api/formula.json";

function configIn(dir: string): ChunkedCacheConfig {
  const baseDir = path.join(dir, "formula");
  return {
    baseDir,
    indexPath: path.join(baseDir, "index.json"),
    metaPath: path.join(baseDir, "meta.json"),
    type: "formula",
  };
}

const SUPPORT_DIR = path.join(os.homedir(), "Library/Application Support/com.raycast.macos/extensions/brew");
const SOURCE = path.join(SUPPORT_DIR, "formula.json");
const CASK_SOURCE = path.join(SUPPORT_DIR, "cask.json");
const CASK_SOURCE_URL = "https://formulae.brew.sh/api/cask.json";

async function fileExists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function sourceExists(): Promise<boolean> {
  return fileExists(SOURCE);
}

interface RawFormula {
  name: string;
  desc?: string;
  aliases?: string[];
  disabled?: boolean;
  requirements?: { name: string }[];
}

/**
 * Formulae whose real records carry a non-empty `requirements[]` (captured
 * 2026-09-14). Several, because any one of them can leave the catalogue.
 */
const WITH_REQUIREMENTS = ["acl", "age-plugin-se", "amdatu-bootstrap", "anyzig"];

const extractIndex = (item: RawFormula, chunkNumber: number, indexInChunk: number): IndexEntry => ({
  id: item.name,
  n: item.name.toLowerCase(),
  d: item.desc?.toLowerCase(),
  a: item.aliases?.map((a) => a.toLowerCase()),
  c: chunkNumber,
  i: indexInChunk,
});

interface RawCask {
  token: string;
  desc?: string;
  languages?: string[];
  artifacts?: CaskArtifact[];
  has_symlink_artifacts?: boolean;
}

/** Casks whose real records carry a non-empty `languages[]` (captured 2026-09-14). */
const WITH_LANGUAGES = ["firefox", "battle-net", "clibor"];

/**
 * Committed fixtures: 3 real formula records and 3 real cask records, so the
 * key-survival assertions run on a machine that has never opened the extension.
 * The live tests above still earn their place — only real data catches a chunk
 * offset that is wrong at scale.
 */
const FIXTURE_FORMULA = path.join(__dirname, "__fixtures__/formula.small.json");
const FIXTURE_CASK = path.join(__dirname, "__fixtures__/cask.small.json");

interface RawCaskFull extends RawCask {
  depends_on?: { macos?: unknown };
}

describe("buildChunkedCache (committed fixtures)", () => {
  it("keeps requirements, disabled and languages through the stream filter, and drops artifacts", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "brew-chunk-fixture-"));
    try {
      const formulaConfig = configIn(dir);
      // A URL that cannot resolve: buildChunkedCache only HEADs it for a
      // last-modified stamp and falls back to now, so the build stays offline.
      await buildChunkedCache<RawFormula>(FIXTURE_FORMULA, "file:///nonexistent", formulaConfig, extractIndex);

      const formulaIndex = await loadIndex(formulaConfig);
      expect(formulaIndex.entries.map((e) => e.id).sort()).toEqual(["abi-dumper", "aescrypt-packetizer", "wget"]);

      const formulae = await loadItemsFromChunks<RawFormula>(formulaConfig, formulaIndex.entries);
      const byName = new Map(formulae.map((f) => [f.name, f]));
      expect(byName.get("abi-dumper")?.requirements?.length).toBeGreaterThan(0);
      expect(byName.get("aescrypt-packetizer")?.disabled).toBe(true);
      expect(byName.get("wget")?.disabled).toBe(false);

      const caskBase = path.join(dir, "cask");
      const caskConfig: ChunkedCacheConfig = {
        baseDir: caskBase,
        indexPath: path.join(caskBase, "index.json"),
        metaPath: path.join(caskBase, "meta.json"),
        type: "cask",
      };
      await buildChunkedCache<RawCaskFull>(
        FIXTURE_CASK,
        "file:///nonexistent",
        caskConfig,
        (item, chunkNumber, indexInChunk) => ({
          id: item.token,
          n: item.token.toLowerCase(),
          d: item.desc?.toLowerCase(),
          c: chunkNumber,
          i: indexInChunk,
        }),
        undefined,
        undefined,
        compactCaskArtifacts,
      );

      const caskIndex = await loadIndex(caskConfig);
      expect(caskIndex.entries.map((e) => e.id).sort()).toEqual(["0-ad", "1password-cli", "battle-net"]);

      const casks = await loadItemsFromChunks<RawCaskFull>(caskConfig, caskIndex.entries);
      const byToken = new Map(casks.map((c) => [c.token, c]));
      expect(byToken.get("battle-net")?.languages?.length).toBeGreaterThan(0);
      // `artifacts` reaches the build — it has to, to be read — but is reduced
      // to one boolean before it is written. 1password-cli is the fixture that
      // HAS a `binary` stanza and 0-ad is the one that does not, so both halves
      // of the derivation are asserted against real records; if the array ever
      // survives to disk again, this is where it shows up.
      expect(byToken.get("1password-cli")?.artifacts).toBeUndefined();
      expect(byToken.get("1password-cli")?.has_symlink_artifacts).toBe(true);
      expect(byToken.get("0-ad")?.has_symlink_artifacts).toBe(false);
      expect(byToken.get("0-ad")?.depends_on?.macos).toBeDefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe("buildChunkedCache", () => {
  it("indexes every record and keeps chunk coordinates addressable", async () => {
    if (!(await sourceExists())) {
      return;
    }
    const dir = await mkdtemp(path.join(os.tmpdir(), "brew-chunk-"));
    const config = configIn(dir);

    try {
      await buildChunkedCache<RawFormula>(SOURCE, SOURCE_URL, config, extractIndex);

      const index = await loadIndex(config);
      // The live index has thousands of formulae; the exact count moves, so
      // assert the shape rather than a number that will rot.
      expect(index.entries.length).toBeGreaterThan(5000);

      // Every entry must resolve back to the record it claims to point at —
      // this is what catches an off-by-one in the chunk/offset bookkeeping,
      // which the backpressure change touches directly.
      const probes = [0, 1, 499, 500, 501, 1000, index.entries.length - 1].filter(
        (i) => i >= 0 && i < index.entries.length,
      );
      const loaded = await loadItemsFromChunks<RawFormula>(
        config,
        probes.map((i) => index.entries[i]),
      );
      expect(loaded.length).toBe(probes.length);
      loaded.forEach((item, n) => {
        expect(item.name).toBe(index.entries[probes[n]].id);
      });

      // The stream filter keeps only whitelisted top-level keys, so a key the
      // UI reads has to be asserted against a real build — a missing one is
      // invisible until the marker silently stops appearing.
      expect(loaded.every((item) => typeof item.disabled === "boolean")).toBe(true);

      const constrained = index.entries.filter((entry) => WITH_REQUIREMENTS.includes(entry.id));
      expect(constrained.length).toBeGreaterThan(0);
      const withRequirements = await loadItemsFromChunks<RawFormula>(config, constrained);
      withRequirements.forEach((item) => {
        expect(item.requirements?.length ?? 0).toBeGreaterThan(0);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);

  // `languages` is kept for the commands that read it; the stream filter drops
  // anything not whitelisted, and nothing else would catch the loss until a
  // feature quietly stopped working. `artifacts` is asserted ABSENT and its
  // derived flag PRESENT — the array is what keeps the cask cache small by not
  // being stored, and the flag is the whole reason it is still parsed.
  it("keeps the cask keys later commands read", async () => {
    if (!(await fileExists(CASK_SOURCE))) {
      return;
    }
    const dir = await mkdtemp(path.join(os.tmpdir(), "brew-chunk-cask-"));
    const baseDir = path.join(dir, "cask");
    const config: ChunkedCacheConfig = {
      baseDir,
      indexPath: path.join(baseDir, "index.json"),
      metaPath: path.join(baseDir, "meta.json"),
      type: "cask",
    };

    try {
      await buildChunkedCache<RawCask>(
        CASK_SOURCE,
        CASK_SOURCE_URL,
        config,
        (item, chunkNumber, indexInChunk) => ({
          id: item.token,
          n: item.token.toLowerCase(),
          d: item.desc?.toLowerCase(),
          c: chunkNumber,
          i: indexInChunk,
        }),
        undefined,
        undefined,
        compactCaskArtifacts,
      );

      const index = await loadIndex(config);
      const entries = index.entries.filter((entry) => WITH_LANGUAGES.includes(entry.id));
      expect(entries.length).toBeGreaterThan(0);

      const loaded = await loadItemsFromChunks<RawCask>(config, entries);
      loaded.forEach((item) => {
        expect(item.languages?.length ?? 0).toBeGreaterThan(0);
        expect(item.artifacts).toBeUndefined();
        expect(typeof item.has_symlink_artifacts).toBe("boolean");
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
