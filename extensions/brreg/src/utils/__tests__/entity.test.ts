import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getEntityIcon,
  isFavorite,
  getFavoriteEntity,
  getBregUrl,
  normalizeWebsiteUrl,
  canMoveUp,
  canMoveDown,
  getMoveIndicators,
  getVatRegistrationStatus,
  formatNorwegianVatNumber,
  copyVatNumberToClipboard,
} from "../entity";
import type { Enhet } from "../../types";
import { Clipboard, showToast, Toast } from "@raycast/api";
import { Icon } from "@raycast/api";

const makeEnhet = (overrides: Partial<Enhet> = {}): Enhet => ({
  organisasjonsnummer: "123456789",
  navn: "Test AS",
  ...overrides,
});

describe("getEntityIcon", () => {
  it("returns emoji when set", () => {
    expect(getEntityIcon(makeEnhet({ emoji: "⭐" }))).toBe("⭐");
  });

  it("returns faviconUrl when no emoji", () => {
    const favicon = "https://example.com/favicon.ico";
    expect(getEntityIcon(makeEnhet({ faviconUrl: favicon }))).toBe(favicon);
  });

  it("returns Icon.Globe fallback when neither set", () => {
    expect(getEntityIcon(makeEnhet())).toBe(Icon.Globe);
  });

  it("uses search favicon fallback before Icon.Globe", () => {
    const searchFavicon = "https://example.com/favicon.ico";
    expect(getEntityIcon(makeEnhet(), searchFavicon)).toBe(searchFavicon);
  });

  it("prioritizes entity favicon over search favicon", () => {
    expect(
      getEntityIcon(
        makeEnhet({ faviconUrl: "https://entity.example/favicon.ico" }),
        "https://search.example/favicon.ico",
      ),
    ).toBe("https://entity.example/favicon.ico");
  });
});

describe("normalizeWebsiteUrl", () => {
  it("returns undefined when empty", () => {
    expect(normalizeWebsiteUrl("")).toBeUndefined();
    expect(normalizeWebsiteUrl(undefined)).toBeUndefined();
  });

  it("adds https scheme when missing", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com");
  });

  it("keeps existing scheme", () => {
    expect(normalizeWebsiteUrl("https://example.com")).toBe("https://example.com");
  });

  it("returns undefined for malformed input", () => {
    expect(normalizeWebsiteUrl("not a url !!")).toBeUndefined();
  });
});

describe("isFavorite", () => {
  it("returns true when org number is in set", () => {
    expect(isFavorite(makeEnhet(), new Set(["123456789"]))).toBe(true);
  });

  it("returns false when org number not in set", () => {
    expect(isFavorite(makeEnhet(), new Set(["999999999"]))).toBe(false);
  });
});

describe("getFavoriteEntity", () => {
  it("returns entity from map when present", () => {
    const entity = makeEnhet();
    const map = new Map([["123456789", entity]]);
    expect(getFavoriteEntity(entity, map)).toBe(entity);
  });

  it("returns undefined when not in map", () => {
    expect(getFavoriteEntity(makeEnhet(), new Map())).toBeUndefined();
  });
});

describe("getBregUrl", () => {
  it("constructs correct brreg URL", () => {
    expect(getBregUrl("123456789")).toBe("https://virksomhet.brreg.no/oppslag/enheter/123456789");
  });
});

describe("canMoveUp", () => {
  it("returns false for index 0", () => {
    expect(canMoveUp(0)).toBe(false);
  });

  it("returns true for index > 0", () => {
    expect(canMoveUp(1)).toBe(true);
    expect(canMoveUp(5)).toBe(true);
  });
});

describe("canMoveDown", () => {
  it("returns false for last item", () => {
    expect(canMoveDown(2, 3)).toBe(false);
  });

  it("returns true for items before last", () => {
    expect(canMoveDown(0, 3)).toBe(true);
    expect(canMoveDown(1, 3)).toBe(true);
  });
});

describe("getMoveIndicators", () => {
  it("returns empty array when move indicators hidden", () => {
    expect(getMoveIndicators(1, 3, false)).toEqual([]);
  });

  it("returns up indicator only for last item", () => {
    const indicators = getMoveIndicators(2, 3, true);
    expect(indicators).toHaveLength(1);
    expect(indicators[0].text).toBe("Move up");
  });

  it("returns down indicator only for first item", () => {
    const indicators = getMoveIndicators(0, 3, true);
    expect(indicators).toHaveLength(1);
    expect(indicators[0].text).toBe("Move down");
  });

  it("returns both indicators for middle item", () => {
    const indicators = getMoveIndicators(1, 3, true);
    expect(indicators).toHaveLength(2);
  });

  it("returns no indicators for single item", () => {
    const indicators = getMoveIndicators(0, 1, true);
    expect(indicators).toHaveLength(0);
  });
});

describe("getVatRegistrationStatus", () => {
  it("returns isVatRegistered when present", () => {
    expect(getVatRegistrationStatus({ isVatRegistered: true })).toBe(true);
    expect(getVatRegistrationStatus({ isVatRegistered: false })).toBe(false);
  });

  it("falls back to mvaRegistrert", () => {
    expect(getVatRegistrationStatus({ mvaRegistrert: true })).toBe(true);
    expect(getVatRegistrationStatus({ mvaRegistrert: false })).toBe(false);
  });

  it("falls back to registrertIMvaregisteret", () => {
    expect(getVatRegistrationStatus({ registrertIMvaregisteret: true })).toBe(true);
  });

  it("returns undefined when no field present", () => {
    expect(getVatRegistrationStatus({})).toBeUndefined();
  });

  it("isVatRegistered takes precedence over mvaRegistrert", () => {
    expect(getVatRegistrationStatus({ isVatRegistered: false, mvaRegistrert: true })).toBe(false);
  });
});

describe("formatNorwegianVatNumber", () => {
  it("formats clean org number", () => {
    expect(formatNorwegianVatNumber("123456789")).toBe("NO 123456789 MVA");
  });

  it("strips leading/trailing whitespace", () => {
    expect(formatNorwegianVatNumber("  123456789  ")).toBe("NO 123456789 MVA");
  });

  it("strips internal whitespace", () => {
    expect(formatNorwegianVatNumber("123 456 789")).toBe("NO 123456789 MVA");
  });
});

describe("copyVatNumberToClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies VAT number when registered", async () => {
    await copyVatNumberToClipboard("123456789", "Test AS", true);
    expect(Clipboard.copy).toHaveBeenCalledWith("NO 123456789 MVA");
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: Toast.Style.Success, title: "VAT Number Copied" }),
    );
  });

  it("shows failure toast when not registered", async () => {
    await copyVatNumberToClipboard("123456789", "Test AS", false);
    expect(Clipboard.copy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: Toast.Style.Failure, title: "Not VAT Registered" }),
    );
  });

  it("supports overriding not VAT registered message", async () => {
    await copyVatNumberToClipboard(
      "123456789",
      "Test AS",
      false,
      undefined,
      (name) => `Company ${name} is not registered for VAT`,
    );
    expect(Clipboard.copy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Failure,
        title: "Not VAT Registered",
        message: "Company Test AS is not registered for VAT",
      }),
    );
  });

  it("shows unknown status toast when vatStatus is undefined", async () => {
    await copyVatNumberToClipboard("123456789", "Test AS", undefined);
    expect(Clipboard.copy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: Toast.Style.Failure, title: "VAT Status Unknown" }),
    );
  });
});
