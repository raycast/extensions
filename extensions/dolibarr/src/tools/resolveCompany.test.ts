import { describe, expect, it } from "vitest";
import type { Thirdparty } from "../api/types";
import { resolveCompany } from "./resolveCompany";

function company(id: number, name: string, nameAlias: string | null = null): Thirdparty {
  return { id, name, nameAlias, email: null, phone: null, customerCode: null, relation: "customer" };
}

const companies = [
  company(1, "Kranich AG"),
  company(2, "Kranich Antriebe AG"),
  company(3, "Müller GmbH"),
  company(4, "Müller-Mineral AG"),
  company(5, "Weitblick Logistik GmbH", "Weitblick"),
];

describe("resolveCompany", () => {
  it("reports when nothing matches", () => {
    expect(resolveCompany(companies, "zzzznichts").kind).toBe("none");
  });

  it("returns the only match", () => {
    const result = resolveCompany(companies, "weitblick logistik");
    expect(result.kind).toBe("one");
    if (result.kind === "one") expect(result.company.id).toBe(5);
  });

  it("returns candidates instead of guessing when several match", () => {
    const result = resolveCompany(companies, "müller");
    expect(result.kind).toBe("many");
    if (result.kind === "many") {
      expect(result.candidates.map((c) => c.id).sort()).toEqual([3, 4]);
    }
  });

  it("lets an exact name match beat ambiguity", () => {
    const result = resolveCompany(companies, "Kranich AG");
    expect(result.kind).toBe("one");
    if (result.kind === "one") expect(result.company.id).toBe(1);
  });

  it("recognises an exact match on the alias too", () => {
    const result = resolveCompany(companies, "Weitblick");
    expect(result.kind).toBe("one");
    if (result.kind === "one") expect(result.company.id).toBe(5);
  });

  it("stays ambiguous when the term is only part of the name", () => {
    expect(resolveCompany(companies, "kranich").kind).toBe("many");
  });

  it("caps the number of candidates", () => {
    const many = Array.from({ length: 20 }, (_, i) => company(100 + i, `Test ${i} GmbH`));
    const result = resolveCompany(many, "test", 5);
    expect(result.kind).toBe("many");
    if (result.kind === "many") expect(result.candidates).toHaveLength(5);
  });

  it("tolerates an empty query", () => {
    expect(resolveCompany(companies, "   ").kind).toBe("none");
  });
});
