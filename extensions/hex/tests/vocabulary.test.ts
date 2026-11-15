import { describe, expect, it } from "vitest";
import { planVocabularyEdit, splitSpellings, vocabularyAddArgs } from "../src/lib/vocabulary";

describe("splitSpellings", () => {
  it("trims, drops blanks, and dedupes ignoring case", () => {
    expect(splitSpellings(" flycast, flight cast,, Flycast ,")).toEqual(["flycast", "flight cast"]);
  });

  it("returns nothing for an empty field", () => {
    expect(splitSpellings("")).toEqual([]);
  });
});

describe("vocabularyAddArgs", () => {
  it("leaves out --sounds-like when there are no spellings", () => {
    expect(vocabularyAddArgs("Riv", [])).toEqual(["vocabulary", "add", "Riv"]);
  });

  it("joins spellings with commas", () => {
    expect(vocabularyAddArgs("Reina", ["Raina", "Rayna"])).toEqual([
      "vocabulary",
      "add",
      "Reina",
      "--sounds-like",
      "Raina,Rayna",
    ]);
  });
});

describe("planVocabularyEdit", () => {
  const before = {
    term: "Flightcast",
    sounds_like: ["flycast", "flight cast"],
  };

  it("does nothing when nothing changed", () => {
    expect(planVocabularyEdit(before, "Flightcast", ["Flycast", "flight cast"])).toEqual([]);
  });

  it("only adds the new spellings when every old one stays", () => {
    expect(planVocabularyEdit(before, "Flightcast", ["flycast", "flight cast", "fly cast"])).toEqual([
      ["vocabulary", "add", "Flightcast", "--sounds-like", "fly cast"],
    ]);
  });

  it("removes and re-adds when a spelling is dropped", () => {
    expect(planVocabularyEdit(before, "Flightcast", ["flycast"])).toEqual([
      ["vocabulary", "remove", "Flightcast"],
      ["vocabulary", "add", "Flightcast", "--sounds-like", "flycast"],
    ]);
  });

  it("removes and re-adds on a rename, even one that only changes case", () => {
    expect(planVocabularyEdit({ term: "riv" }, "Riv", [])).toEqual([
      ["vocabulary", "remove", "riv"],
      ["vocabulary", "add", "Riv"],
    ]);
  });
});
