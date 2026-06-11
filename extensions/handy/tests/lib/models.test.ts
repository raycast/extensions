import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MODEL_REGISTRY, isDownloaded, getDownloadedModels } from "../../src/lib/models";

const TMP = join(tmpdir(), "handy-test-models");
beforeEach(() => mkdirSync(TMP, { recursive: true }));
afterEach(() => rmSync(TMP, { recursive: true, force: true }));

describe("MODEL_REGISTRY", () => {
  it("has 15 known models", () => expect(MODEL_REGISTRY).toHaveLength(15));
  it("Whisper Medium filename is whisper-medium-q4_1.bin, file type", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "medium")!;
    expect(m.filename).toBe("whisper-medium-q4_1.bin");
    expect(m.isDirectory).toBe(false);
  });
  it("Whisper Large filename is ggml-large-v3-q5_0.bin", () =>
    expect(MODEL_REGISTRY.find(m => m.id === "large")?.filename).toBe("ggml-large-v3-q5_0.bin"));
  it("Breeze ASR is a file (not directory)", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "breeze-asr")!;
    expect(m.filename).toBe("breeze-asr-q5_k.bin");
    expect(m.isDirectory).toBe(false);
  });
  it("Parakeet V3 is a directory", () =>
    expect(MODEL_REGISTRY.find(m => m.id === "parakeet-tdt-0.6b-v3")?.isDirectory).toBe(true));
  it("GigaAM uses .onnx extension and is a file", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "gigaam-v3-e2e-ctc")!;
    expect(m.filename).toBe("giga-am-v3.int8.onnx");
    expect(m.isDirectory).toBe(false);
  });
});

describe("isDownloaded", () => {
  it("returns false when file absent", () =>
    expect(isDownloaded({ id: "x", name: "X", description: "", filename: "no.bin", isDirectory: false, supportsLanguageSelection: false }, TMP)).toBe(false));
  it("returns true when file present", () => {
    writeFileSync(join(TMP, "test.bin"), "");
    expect(isDownloaded({ id: "x", name: "X", description: "", filename: "test.bin", isDirectory: false, supportsLanguageSelection: false }, TMP)).toBe(true);
  });
  it("returns true when dir present", () => {
    mkdirSync(join(TMP, "model-dir"));
    expect(isDownloaded({ id: "x", name: "X", description: "", filename: "model-dir", isDirectory: true, supportsLanguageSelection: false }, TMP)).toBe(true);
  });
});

describe("getDownloadedModels", () => {
  it("returns only downloaded known models", () => {
    writeFileSync(join(TMP, "ggml-small.bin"), "");
    const r = getDownloadedModels(TMP);
    expect(r.some(m => m.id === "small")).toBe(true);
    expect(r.some(m => m.id === "medium")).toBe(false);
  });
  it("includes custom .bin files not in registry", () => {
    writeFileSync(join(TMP, "my-custom.bin"), "");
    expect(getDownloadedModels(TMP).some(m => m.filename === "my-custom.bin")).toBe(true);
  });
  it("does not duplicate known models as custom", () => {
    writeFileSync(join(TMP, "ggml-small.bin"), "");
    expect(getDownloadedModels(TMP).filter(m => m.filename === "ggml-small.bin")).toHaveLength(1);
  });
  it("returns [] when models dir missing", () =>
    expect(getDownloadedModels("/nonexistent/path")).toEqual([]));
});

describe("MODEL_REGISTRY language selection fields", () => {
  it("Whisper models support language selection with no language filter", () => {
    for (const id of ["small", "medium", "turbo", "large"]) {
      const m = MODEL_REGISTRY.find(m => m.id === id)!;
      expect(m.supportsLanguageSelection).toBe(true);
      expect(m.supportedLanguages).toBeUndefined();
    }
  });

  it("Breeze ASR supports language selection with no language filter", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "breeze-asr")!;
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toBeUndefined();
  });

  it("SenseVoice supports language selection with 7 languages including zh", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "sense-voice-int8")!;
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toEqual(
      expect.arrayContaining(["zh", "zh-Hans", "zh-Hant", "en", "yue", "ja", "ko"])
    );
    expect(m.supportedLanguages).toHaveLength(7);
  });

  it("Canary 180M Flash supports language selection with en/de/es/fr", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "canary-180m-flash")!;
    expect(m).toBeDefined();
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toEqual(
      expect.arrayContaining(["en", "de", "es", "fr"])
    );
    expect(m.supportedLanguages).toHaveLength(4);
  });

  it("Canary 1B v2 supports language selection with 25 languages", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "canary-1b-v2")!;
    expect(m).toBeDefined();
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toHaveLength(25);
  });

  it("Parakeet models do not support language selection", () => {
    for (const id of ["parakeet-tdt-0.6b-v2", "parakeet-tdt-0.6b-v3"]) {
      expect(MODEL_REGISTRY.find(m => m.id === id)!.supportsLanguageSelection).toBe(false);
    }
  });

  it("Moonshine models do not support language selection", () => {
    for (const id of ["moonshine-base", "moonshine-tiny-streaming-en", "moonshine-small-streaming-en", "moonshine-medium-streaming-en"]) {
      expect(MODEL_REGISTRY.find(m => m.id === id)!.supportsLanguageSelection).toBe(false);
    }
  });

  it("GigaAM does not support language selection", () => {
    expect(MODEL_REGISTRY.find(m => m.id === "gigaam-v3-e2e-ctc")!.supportsLanguageSelection).toBe(false);
  });
});
