import { describe, expect, it } from "vitest";
import { createCompanyFromBrregEntity, BrregEntity } from "../brreg-api";

const base: BrregEntity = {
  navn: "Acme AS",
  organisasjonsnummer: "123456789",
};

describe("createCompanyFromBrregEntity", () => {
  it("maps name and org number", () => {
    const company = createCompanyFromBrregEntity(base);
    expect(company.name).toBe("Acme AS");
    expect(company.organizationNumber).toBe("123456789");
  });

  it("builds a bregUrl from org number", () => {
    const company = createCompanyFromBrregEntity(base);
    expect(company.bregUrl).toContain("123456789");
  });

  it("falls back to brreg search URL when org number missing", () => {
    const company = createCompanyFromBrregEntity({ navn: "Missing Corp" });
    // encodeURIComponent uses %20, not +
    expect(company.bregUrl).toContain("Missing%20Corp");
  });

  it("maps forretningsadresse fields", () => {
    const company = createCompanyFromBrregEntity({
      ...base,
      forretningsadresse: {
        adresse: ["Storgata 1"],
        postnummer: "0182",
        poststed: "OSLO",
        kommune: "OSLO",
        kommunenummer: "0301",
      },
    });
    expect(company.address).toBe("Storgata 1");
    expect(company.postalCode).toBe("0182");
    expect(company.city).toBe("OSLO");
    expect(company.municipality).toBe("OSLO");
    expect(company.municipalityNumber).toBe("0301");
  });

  it("normalises website with no scheme to https", () => {
    const company = createCompanyFromBrregEntity({ ...base, hjemmeside: "example.com" });
    expect(company.website).toBe("https://example.com");
  });

  it("accepts website with existing https scheme", () => {
    const company = createCompanyFromBrregEntity({ ...base, hjemmeside: "https://example.com" });
    expect(company.website).toBe("https://example.com");
  });

  it("discards malformed website", () => {
    const company = createCompanyFromBrregEntity({ ...base, hjemmeside: "not a url !!" });
    expect(company.website).toBeUndefined();
  });

  it("maps VAT registration from mvaRegistrert", () => {
    const company = createCompanyFromBrregEntity({ ...base, mvaRegistrert: true });
    expect(company.isVatRegistered).toBe(true);
  });

  it("maps VAT registration from registrertIMvaregisteret", () => {
    const company = createCompanyFromBrregEntity({ ...base, registrertIMvaregisteret: false });
    expect(company.isVatRegistered).toBe(false);
  });

  it("maps industry and NACE code", () => {
    const company = createCompanyFromBrregEntity({
      ...base,
      naeringskode1: { kode: "62.010", beskrivelse: "Utvikling av programvare" },
    });
    expect(company.industry).toBe("Utvikling av programvare");
    expect(company.naceCode).toBe("62.010");
  });

  it("maps employee count as string", () => {
    const company = createCompanyFromBrregEntity({ ...base, antallAnsatte: 42 });
    expect(company.employees).toBe("42");
  });

  it("returns undefined employees when not present", () => {
    const company = createCompanyFromBrregEntity(base);
    expect(company.employees).toBeUndefined();
  });
});
