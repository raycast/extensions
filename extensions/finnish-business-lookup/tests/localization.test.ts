import { describe, expect, test } from "bun:test";
import { formatAddressForClipboard, formatDate, getStatusText } from "../src/lib/format";
import {
  getLanguageFallbackOrder,
  getPreferredLanguageCode,
  parseDeviceLanguage,
  resolveLanguage,
} from "../src/lib/language";
import { classifyQuery } from "../src/lib/query";
import { getEntryLabel, getPrimaryCity, selectDescription, toUiCompany } from "../src/lib/selectors";
import { translate } from "../src/lib/translations";
import { buildWhatsNewMarkdown } from "../src/lib/whats-new";
import type { PrhCompany } from "../src/types/prh";

describe("device language and overrides", () => {
  test("uses Finnish only when it is the primary device language", () => {
    for (const locale of ["fi", "fi-FI", "fi_FI", "FI-fi"]) {
      expect(resolveLanguage("system", locale)).toBe("fi");
    }
    for (const locale of ["en-FI", "sv-FI", "de-DE", "", "fil-PH"]) {
      expect(resolveLanguage("system", locale)).toBe("en");
    }
    expect(resolveLanguage()).toBe("en");
  });

  test("manual language wins over the device language", () => {
    expect(resolveLanguage("en", "fi-FI")).toBe("en");
    expect(resolveLanguage("fi", "en-US")).toBe("fi");
  });

  test("reads the first macOS language, including quoted regional tags", () => {
    expect(parseDeviceLanguage('(\n    "fi-FI",\n    en\n)')).toBe("fi-FI");
    expect(parseDeviceLanguage("(\n    en,\n    fi\n)")).toBe("en");
    expect(parseDeviceLanguage("(fi)")).toBe("fi");
    expect(parseDeviceLanguage("()")).toBeUndefined();
    expect(parseDeviceLanguage("unexpected output")).toBeUndefined();
  });

  test("keeps PRH fallback languages unique and in preference order", () => {
    expect(getLanguageFallbackOrder(getPreferredLanguageCode("fi"))).toEqual(["1", "3", "2"]);
    expect(getLanguageFallbackOrder(getPreferredLanguageCode("en"))).toEqual(["3", "1", "2"]);
  });
});

describe("localized search safety", () => {
  test("invalid inputs stay blocked in both languages", () => {
    for (const language of ["en", "fi"] as const) {
      expect(classifyQuery("   ", language)).toEqual({ kind: "empty" });
      expect(classifyQuery("123", language).kind).toBe("invalid-numeric");
      expect(classifyQuery("no", language).kind).toBe("too-short-text");
      expect(classifyQuery("123", language).hint).toBe(translate("numericHint", language));
      expect(classifyQuery("no", language).hint).toBe(translate("textHint", language));
    }
  });

  test("valid inputs preserve normalization and search modes", () => {
    for (const language of ["en", "fi"] as const) {
      expect(classifyQuery(" 01120389 ", language).normalizedBusinessId).toBe("0112038-9");
      expect(classifyQuery("0112038-9", language).kind).toBe("businessId");
      expect(classifyQuery(" Nokia ", language)).toEqual({ kind: "name", value: "Nokia" });
    }
  });
});

const fixture: PrhCompany = {
  businessId: { value: "0112038-9", source: "1" },
  names: [{ name: "Example Oy", type: "1", version: 1, source: "1" }],
  companyForms: [
    {
      type: "OY",
      version: 1,
      source: "1",
      descriptions: [
        { languageCode: "1", description: "Osakeyhtiö" },
        { languageCode: "3", description: "Limited company" },
      ],
    },
  ],
  mainBusinessLine: {
    type: "62010",
    source: "1",
    descriptions: [
      { languageCode: "1", description: "Ohjelmistojen suunnittelu ja valmistus" },
      { languageCode: "3", description: "Computer programming activities" },
    ],
  },
  addresses: [
    {
      type: 2,
      source: "1",
      postOfficeBox: "123",
      postCode: "00100",
      postOffices: [
        { languageCode: "1", city: "Helsinki" },
        { languageCode: "3", city: "Helsinki (EN)" },
      ],
    },
  ],
  registeredEntries: [],
  tradeRegisterStatus: "1",
  status: "2",
};

describe("PRH data follows the interface language", () => {
  test("switching a persisted English result to Finnish remaps labels from raw data", () => {
    const english = toUiCompany(fixture, ["3", "1", "2"]);
    const cached = JSON.parse(JSON.stringify(english));
    const finnish = toUiCompany(cached.raw, ["1", "3", "2"]);
    expect(english.companyFormLabel).toBe("Limited company");
    expect(finnish.companyFormLabel).toBe("Osakeyhtiö");
    expect(finnish.mainBusinessLineLabel).toBe("Ohjelmistojen suunnittelu ja valmistus");
    expect(finnish.businessIdStatusLabel).toBe("Voimassa");
    expect(finnish.tradeRegisterStatusLabel).toBe("Rekisterissä");
    expect(getPrimaryCity(finnish)).toBe("Helsinki");
    expect(finnish.displayName).toBe(english.displayName);
    expect(finnish.businessId).toBe(english.businessId);
    expect(toUiCompany(finnish.raw, ["3", "1", "2"]).companyFormLabel).toBe("Limited company");
  });

  test("missing descriptions fall back without inventing company data", () => {
    const descriptions = [{ languageCode: "3", description: "English only" }];
    expect(selectDescription(descriptions, ["1", "3", "2"])).toBe("English only");
    expect(selectDescription([{ languageCode: "2", description: "Svenska" }], ["1", "3", "2"])).toBe("Svenska");
    expect(selectDescription([], ["1", "3", "2"])).toBeUndefined();
    expect(getEntryLabel({ type: "999", register: "1", authority: "2" }, ["1", "3", "2"])).toBe("Tyyppi 999");
    expect(toUiCompany({ ...fixture, status: "999" }, ["1", "3", "2"]).businessIdStatusLabel).toBe("Tuntematon (999)");
    expect(getStatusText(undefined, "999", "fi")).toBe("Koodi 999");
    expect(getStatusText(undefined, undefined, "fi")).toBe("Ei saatavilla");
  });

  test("dates and copied postal addresses follow the selected language", () => {
    expect(formatDate("2026-07-25", "fi")).toBe("25.7.2026");
    expect(formatDate("2026-07-25", "en")).toBe("25 Jul 2026");
    expect(formatDate(undefined, "fi")).toBeUndefined();
    expect(formatAddressForClipboard(fixture.addresses![0], ["1", "3", "2"])).toBe("PL 123\n00100 Helsinki");
    expect(formatAddressForClipboard(fixture.addresses![0], ["3", "1", "2"])).toBe("P.O. Box 123\n00100 Helsinki (EN)");
  });

  test("in-app release notes are translated without changing versions", () => {
    expect(buildWhatsNewMarkdown("fi")).toContain("# Uutta");
    expect(buildWhatsNewMarkdown("fi")).toContain("0.2.1 - Selkeämmät hakutulokset (25.7.2026)");
    expect(buildWhatsNewMarkdown("fi")).not.toContain("Company names now");
    expect(buildWhatsNewMarkdown("en")).toContain("Company names now");
  });
});
