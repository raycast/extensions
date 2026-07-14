import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  discoverHfCacheModels,
  discoverLegacyDirModels,
  getDownloadedModels,
} from "../../src/lib/models";

const ROOT = join(tmpdir(), "handy-test-models");
const HUB = join(ROOT, "hub");
const MODELS = join(ROOT, "models");

/** Write a fake hf-hub cache entry with a resolvable snapshot + real files. */
function seedRepo(
  repoDir: string, // e.g. "models--handy-computer--parakeet-ctc-0.6b-gguf"
  files: string[],
  { rev = "rev0", writeRef = true }: { rev?: string; writeRef?: boolean } = {},
) {
  const base = join(HUB, repoDir);
  const snapshot = join(base, "snapshots", rev);
  mkdirSync(snapshot, { recursive: true });
  for (const f of files) writeFileSync(join(snapshot, f), "");
  if (writeRef) {
    mkdirSync(join(base, "refs"), { recursive: true });
    writeFileSync(join(base, "refs", "main"), rev);
  }
}

beforeEach(() => {
  mkdirSync(HUB, { recursive: true });
  mkdirSync(MODELS, { recursive: true });
});
afterEach(() => rmSync(ROOT, { recursive: true, force: true }));

describe("discoverHfCacheModels", () => {
  it("finds a GGUF model and enriches it from the catalog", () => {
    seedRepo("models--handy-computer--parakeet-ctc-0.6b-gguf", [
      "parakeet-ctc-0.6b-Q8_0.gguf",
    ]);
    const [model, ...rest] = discoverHfCacheModels(HUB);
    expect(rest).toHaveLength(0);
    expect(model.id).toBe(
      "handy-computer/parakeet-ctc-0.6b-gguf/parakeet-ctc-0.6b-Q8_0.gguf",
    );
    expect(model.name).toBe("Parakeet CTC 0.6B");
    expect(model.description).toMatch(/English/);
    expect(model.quant).toBe("Q8_0");
    expect(model.source).toBe("catalog");
    // English-only → no language selection
    expect(model.supportsLanguageSelection).toBe(false);
    expect(model.supportedLanguages).toEqual(["en"]);
  });

  it("marks multilingual models as language-selectable", () => {
    seedRepo("models--handy-computer--parakeet-tdt-0.6b-v3-gguf", [
      "parakeet-tdt-0.6b-v3-Q8_0.gguf",
    ]);
    const [model] = discoverHfCacheModels(HUB);
    expect(model.name).toBe("Parakeet TDT 0.6B v3");
    expect(model.supportsLanguageSelection).toBe(true);
    expect(model.supportedLanguages?.length).toBe(25);
  });

  it("lists every downloaded quant as its own entry", () => {
    seedRepo("models--handy-computer--parakeet-ctc-0.6b-gguf", [
      "parakeet-ctc-0.6b-Q4_K_M.gguf",
      "parakeet-ctc-0.6b-Q8_0.gguf",
    ]);
    const quants = discoverHfCacheModels(HUB)
      .map((m) => m.quant)
      .sort();
    expect(quants).toEqual(["Q4_K_M", "Q8_0"]);
  });

  it("falls back to a prettified name for repos not in the catalog", () => {
    seedRepo("models--someone--mystery-model-gguf", ["mystery-Q4_0.gguf"]);
    const [model] = discoverHfCacheModels(HUB);
    expect(model.name).toBe("mystery model");
    expect(model.description).toBe("Downloaded model");
    // Unknown model → permissive language selection
    expect(model.supportsLanguageSelection).toBe(true);
  });

  it("honours the commit pinned by refs/main over other snapshots", () => {
    seedRepo(
      "models--handy-computer--parakeet-ctc-0.6b-gguf",
      ["a-Q8_0.gguf"],
      {
        rev: "pinned",
      },
    );
    // A stray older snapshot with a different file must be ignored.
    const stray = join(
      HUB,
      "models--handy-computer--parakeet-ctc-0.6b-gguf",
      "snapshots",
      "stray",
    );
    mkdirSync(stray, { recursive: true });
    writeFileSync(join(stray, "b-Q4_0.gguf"), "");
    const files = discoverHfCacheModels(HUB).map((m) => m.id.split("/").pop());
    expect(files).toEqual(["a-Q8_0.gguf"]);
  });

  it("falls back to another snapshot when the pinned one has no gguf", () => {
    // refs/main points at a snapshot that exists but holds no downloaded gguf.
    seedRepo(
      "models--handy-computer--parakeet-ctc-0.6b-gguf",
      ["config.json"],
      {
        rev: "pinned",
      },
    );
    // A different snapshot for the same repo has the real download.
    const downloaded = join(
      HUB,
      "models--handy-computer--parakeet-ctc-0.6b-gguf",
      "snapshots",
      "downloaded",
    );
    mkdirSync(downloaded, { recursive: true });
    writeFileSync(join(downloaded, "parakeet-ctc-0.6b-Q8_0.gguf"), "");
    const files = discoverHfCacheModels(HUB).map((m) => m.id.split("/").pop());
    expect(files).toEqual(["parakeet-ctc-0.6b-Q8_0.gguf"]);
  });

  it("ignores non-model cache dirs and repos without a gguf", () => {
    seedRepo("datasets--foo--bar", ["data.gguf"]); // wrong prefix
    seedRepo("models--handy-computer--empty-gguf", ["config.json"]); // no gguf
    mkdirSync(join(HUB, "version.txt"), { recursive: true });
    expect(discoverHfCacheModels(HUB)).toEqual([]);
  });

  it("returns [] when the hub dir is missing", () =>
    expect(discoverHfCacheModels(join(ROOT, "nope"))).toEqual([]));
});

describe("discoverLegacyDirModels", () => {
  it("resolves legacy built-in models to their short id, name and capabilities", () => {
    writeFileSync(join(MODELS, "ggml-small.bin"), ""); // Whisper Small
    mkdirSync(join(MODELS, "parakeet-tdt-0.6b-v2-int8")); // Parakeet V2
    const models = discoverLegacyDirModels(MODELS);
    const small = models.find((m) => m.id === "small");
    expect(small?.name).toBe("Whisper Small");
    expect(small?.supportsLanguageSelection).toBe(true);
    const parakeet = models.find((m) => m.id === "parakeet-tdt-0.6b-v2");
    expect(parakeet?.name).toBe("Parakeet V2");
    expect(parakeet?.supportsLanguageSelection).toBe(false);
  });

  it("includes custom .bin, .gguf files and dirs, and skips other files", () => {
    writeFileSync(join(MODELS, "my-custom.bin"), "");
    writeFileSync(join(MODELS, "another.gguf"), "");
    mkdirSync(join(MODELS, "onnx-model"));
    writeFileSync(join(MODELS, "ignore.txt"), "");
    const custom = discoverLegacyDirModels(MODELS).filter(
      (m) => m.source === "custom",
    );
    expect(custom.map((m) => m.id).sort()).toEqual([
      "another.gguf",
      "my-custom.bin",
      "onnx-model",
    ]);
  });

  it("does not list a known legacy model as custom", () => {
    writeFileSync(join(MODELS, "ggml-small.bin"), "");
    const matches = discoverLegacyDirModels(MODELS).filter(
      (m) => m.name === "ggml-small.bin" || m.id === "small",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].source).toBe("catalog");
  });

  it("returns [] when the models dir is missing", () =>
    expect(discoverLegacyDirModels(join(ROOT, "nope"))).toEqual([]));
});

describe("getDownloadedModels", () => {
  it("merges HF cache and custom models", () => {
    seedRepo("models--handy-computer--parakeet-ctc-0.6b-gguf", [
      "parakeet-ctc-0.6b-Q8_0.gguf",
    ]);
    writeFileSync(join(MODELS, "my-custom.bin"), "");
    const models = getDownloadedModels({ hubDir: HUB, modelsDir: MODELS });
    expect(models.some((m) => m.source === "catalog")).toBe(true);
    expect(models.some((m) => m.id === "my-custom.bin")).toBe(true);
  });

  it("returns [] when nothing is downloaded", () =>
    expect(
      getDownloadedModels({
        hubDir: join(ROOT, "nope"),
        modelsDir: join(ROOT, "nope2"),
      }),
    ).toEqual([]));
});
