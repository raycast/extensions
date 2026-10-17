import { describe, expect, it } from "vitest";
import { filterRankings, findRanked, pickerOrder, rankModels } from "../src/lib/models";
import { model } from "./fixtures";

describe("rankings", () => {
  it("ranks all configurations by raw intelligence with competition ties", () => {
    const source = [
      model({ id: "low", name: "Alpha (Low)", intelligence: 40 }),
      model({ id: "beta", name: "Beta", intelligence: 70 }),
      model({ id: "high", name: "Alpha (High)", intelligence: 70 }),
      model({ id: "top", name: "Top", intelligence: 80 }),
    ];
    const ranked = rankModels(source);
    expect(ranked.map(({ id, rank }) => [id, rank])).toEqual([
      ["top", 1],
      ["high", 2],
      ["beta", 2],
      ["low", 4],
    ]);
    expect(source[0].id).toBe("low");
  });

  it("keeps zero scores, excluding null and non-finite scores", () => {
    const ranked = rankModels([
      model({ id: "null", intelligence: null }),
      model({ id: "nan", intelligence: NaN }),
      model({ id: "infinite", intelligence: Infinity }),
      model({ id: "zero", intelligence: 0 }),
    ]);
    expect(ranked.map(({ id, rank }) => [id, rank])).toEqual([["zero", 1]]);
  });

  it("does not create ties by rounding the displayed score", () => {
    expect(
      rankModels([model({ id: "a", intelligence: 50.11 }), model({ id: "b", intelligence: 50.12 })]).map(
        ({ id, rank }) => [id, rank],
      ),
    ).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });

  it("filters by name and creator without changing global ranks or order", () => {
    const ranked = rankModels([
      model({ id: "first", name: "Beta", creator: "Other", intelligence: 80 }),
      model({ id: "second", name: "Alpha", creator: "Example Lab", intelligence: 70 }),
      model({ id: "third", name: "Delta", creator: "Example Lab", intelligence: 60 }),
    ]);
    expect(filterRankings(ranked, "  EXAMPLE lab ").map(({ rank }) => rank)).toEqual([2, 3]);
    expect(filterRankings(ranked, "alpha example").map(({ rank }) => rank)).toEqual([2]);
    expect(filterRankings(ranked, "missing")).toEqual([]);
    expect(filterRankings(ranked, " ")).toEqual(ranked);
  });

  it("finds a model by a metric it has when the requested one is missing", () => {
    const models = [
      model({ id: "scored", intelligence: 70, coding: 60 }),
      model({ id: "coding-only", intelligence: null, coding: 80 }),
      model({
        id: "nothing",
        intelligence: null,
        coding: null,
        speed: null,
        latency: null,
        inputPrice: null,
        outputPrice: null,
      }),
    ];
    expect(findRanked(models, "scored", "intelligence")).toMatchObject({ metric: "intelligence", rank: 1 });
    expect(findRanked(models, "coding-only", "intelligence")).toMatchObject({ metric: "coding", rank: 1, value: 80 });
    expect(findRanked(models, "nothing", "intelligence")).toBeUndefined();
  });

  it("lists models without an Intelligence Index score after the ranked ones", () => {
    const models = [
      model({ id: "z", name: "Zeta", intelligence: null }),
      model({ id: "low", name: "Low", intelligence: 40 }),
      model({ id: "a", name: "Alpha", intelligence: null }),
      model({ id: "high", name: "High", intelligence: 80 }),
    ];
    expect(pickerOrder(models).map(({ id, rank }) => [id, rank])).toEqual([
      ["high", 1],
      ["low", 2],
      ["a", undefined],
      ["z", undefined],
    ]);
  });
});
