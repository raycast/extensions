import { describe, it, expect } from "vitest";
import {
  getCatalogEntry,
  repoIdFromModelId,
  languageCapabilities,
  getModelCapabilities,
  prettifyRepo,
} from "../../src/lib/catalog";

describe("repoIdFromModelId", () => {
  it("strips the filename segment from a HF-cache model id", () =>
    expect(
      repoIdFromModelId(
        "handy-computer/parakeet-ctc-0.6b-gguf/parakeet-ctc-0.6b-Q8_0.gguf",
      ),
    ).toBe("handy-computer/parakeet-ctc-0.6b-gguf"));

  it("returns a slash-less legacy id unchanged", () =>
    expect(repoIdFromModelId("small")).toBe("small"));
});

describe("getCatalogEntry", () => {
  it("finds a known repo", () =>
    expect(getCatalogEntry("handy-computer/parakeet-ctc-0.6b-gguf")?.name).toBe(
      "Parakeet CTC 0.6B",
    ));
  it("returns undefined for an unknown repo", () =>
    expect(getCatalogEntry("someone/nope")).toBeUndefined());
});

describe("languageCapabilities", () => {
  it("single-language models are not selectable", () =>
    expect(
      languageCapabilities({
        id: "x",
        name: "X",
        description: "",
        languages: ["en"],
      }),
    ).toEqual({
      supportsLanguageSelection: false,
      supportedLanguages: ["en"],
    }));
  it("multi-language models are selectable", () =>
    expect(
      languageCapabilities({
        id: "x",
        name: "X",
        description: "",
        languages: ["en", "fr"],
      }).supportsLanguageSelection,
    ).toBe(true));
  it("unknown (undefined) entry is treated permissively", () =>
    expect(languageCapabilities(undefined)).toEqual({
      supportsLanguageSelection: true,
    }));
});

describe("getModelCapabilities", () => {
  it("resolves a current HF-cache model id via the catalog", () => {
    const caps = getModelCapabilities(
      "handy-computer/parakeet-ctc-0.6b-gguf/parakeet-ctc-0.6b-Q8_0.gguf",
    );
    expect(caps?.name).toBe("Parakeet CTC 0.6B");
    expect(caps?.supportsLanguageSelection).toBe(false);
  });

  it("falls back to the legacy registry for old short ids", () => {
    const caps = getModelCapabilities("small");
    expect(caps?.name).toBe("Whisper Small");
    expect(caps?.supportsLanguageSelection).toBe(true);
  });

  it("returns undefined for an unknown/custom id", () =>
    expect(getModelCapabilities("my-custom.bin")).toBeUndefined());
});

describe("prettifyRepo", () => {
  it("drops the -gguf suffix and humanises the slug", () =>
    expect(prettifyRepo("someone/mystery-model-gguf")).toBe("mystery model"));
});
