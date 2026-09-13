import { describe, expect, it } from "vitest";
import { foldCatalog, foldModels } from "../src/lib/catalog";
import type { Catalog, Model } from "../src/lib/types";

const model = (id: string): Model => ({ id, cost: null, modalities: null, quota: null, isPick: null });
const models = [1, 2, 3, 4, 5].map((n) => model(`model-${n}`));

describe("foldModels", () => {
  it("slices to maxModels when not searching", () => {
    expect(foldModels(models, 3, "")).toEqual({ models: models.slice(0, 3), folded: 2 });
  });

  it("counts no folded models when at or below maxModels", () => {
    expect(foldModels(models, 5, "")).toEqual({ models, folded: 0 });
    expect(foldModels(models, 9, "")).toEqual({ models, folded: 0 });
  });

  it("expands the full catalog when searching", () => {
    expect(foldModels(models, 3, "model-4")).toEqual({ models, folded: 0 });
  });

  it("treats whitespace-only search text as not searching", () => {
    expect(foldModels(models, 2, "   ")).toEqual({ models: models.slice(0, 2), folded: 3 });
  });

  it("handles an empty catalog", () => {
    expect(foldModels([], 3, "")).toEqual({ models: [], folded: 0 });
    expect(foldModels([], 3, "x")).toEqual({ models: [], folded: 0 });
  });
});

describe("foldCatalog", () => {
  const catalog: Catalog = { go: models, zen: models };

  it("folds each product section independently", () => {
    const views = foldCatalog(catalog, 3, "");
    expect(views.go).toEqual({ models: models.slice(0, 3), folded: 2 });
    expect(views.zen).toEqual({ models: models.slice(0, 3), folded: 2 });
  });

  it("unfolds both sections when searching", () => {
    const views = foldCatalog(catalog, 3, "model-4");
    expect(views.go.folded).toBe(0);
    expect(views.zen.folded).toBe(0);
  });
});
