import { describe, it, expect } from "vitest";
import { slugify, slugCandidates } from "../api/client";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Donald Trump")).toBe("donald-trump");
  });

  it("strips Portuguese accents", () => {
    expect(slugify("saúde")).toBe("saude");
    expect(slugify("inteligência artificial")).toBe("inteligencia-artificial");
    expect(slugify("alterações climáticas")).toBe("alteracoes-climaticas");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  Olá, mundo!  ")).toBe("ola-mundo");
    expect(slugify("C++ & Java")).toBe("c-java");
  });

  it("returns empty string for non-alphanumeric input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("slugCandidates", () => {
  it("returns a single candidate for a one-word query", () => {
    expect(slugCandidates("Benfica")).toEqual(["benfica"]);
  });

  it("returns the full slug for a multi-word entity", () => {
    expect(slugCandidates("Donald Trump")).toEqual(["donald-trump"]);
  });

  it("adds a stopword-stripped fallback", () => {
    expect(slugCandidates("guerra na ucrânia")).toEqual([
      "guerra-na-ucrania",
      "guerra-ucrania",
    ]);
  });

  it("returns one candidate when there are no stopwords to strip", () => {
    expect(slugCandidates("José Mourinho")).toEqual(["jose-mourinho"]);
  });

  it("ignores empty/punctuation-only input", () => {
    expect(slugCandidates("   ")).toEqual([]);
  });
});
