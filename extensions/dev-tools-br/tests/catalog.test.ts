import { describe, expect, it } from "vitest";
import { categories } from "../src/types";
import { tools } from "../src/tools";

describe("catálogo", () => {
  it("mantém IDs únicos e todas as categorias preenchidas", () => {
    expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length);
    for (const category of categories) expect(tools.some((tool) => tool.category === category)).toBe(true);
  });

  it("inclui toda a matriz solicitada", () => {
    expect(tools.length).toBe(80);
  });
});
