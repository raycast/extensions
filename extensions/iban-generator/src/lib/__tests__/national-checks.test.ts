import { describe, expect, it } from "vitest";
import { generateIban } from "../index";
import {
  computeItalianCin,
  isValidDutchElfproefBban,
  isValidFinnishLuhnBban,
  isValidItalianCinBban,
} from "../checksum";

describe("Italian CIN (IT/SM)", () => {
  const itBban = "X0542811101000000123456";
  const smBban = "U0322509800000000270100";

  it("accepts IT registry reference BBAN", () => {
    expect(isValidItalianCinBban(itBban)).toBe(true);
    expect(computeItalianCin("0542811101000000123456")).toBe("X");
  });

  it("accepts SM registry reference BBAN", () => {
    expect(isValidItalianCinBban(smBban)).toBe(true);
    expect(computeItalianCin("0322509800000000270100")).toBe("U");
  });

  it("rejects altered CIN on IT reference", () => {
    expect(isValidItalianCinBban("Y0542811101000000123456")).toBe(false);
  });

  it("rejects altered CIN on SM reference", () => {
    expect(isValidItalianCinBban("V0322509800000000270100")).toBe(false);
  });

  it("generated IT IBANs pass CIN check", () => {
    for (let i = 0; i < 300; i++) {
      const { bban } = generateIban({ countryCode: "IT" });
      expect(isValidItalianCinBban(bban)).toBe(true);
    }
  });

  it("generated SM IBANs pass CIN check", () => {
    for (let i = 0; i < 300; i++) {
      const { bban } = generateIban({ countryCode: "SM" });
      expect(isValidItalianCinBban(bban)).toBe(true);
    }
  });
});

describe("Finnish Luhn BBAN", () => {
  const fiBban = "12345600000785";

  it("accepts Finance Finland reference BBAN", () => {
    expect(isValidFinnishLuhnBban(fiBban)).toBe(true);
  });

  it("rejects altered Luhn digit", () => {
    expect(isValidFinnishLuhnBban("12345600000786")).toBe(false);
  });

  it("generated FI IBANs pass Luhn check", () => {
    for (let i = 0; i < 300; i++) {
      const { bban } = generateIban({ countryCode: "FI" });
      expect(isValidFinnishLuhnBban(bban)).toBe(true);
    }
  });
});

describe("Dutch elfproef", () => {
  const nlBban = "ABNA0417164300";

  it("accepts ABN AMRO reference BBAN account", () => {
    expect(isValidDutchElfproefBban(nlBban)).toBe(true);
  });

  it("rejects altered account check digit", () => {
    expect(isValidDutchElfproefBban("ABNA0417164301")).toBe(false);
  });

  it("generated NL IBANs pass elfproef", () => {
    for (let i = 0; i < 300; i++) {
      const { bban } = generateIban({ countryCode: "NL" });
      expect(isValidDutchElfproefBban(bban)).toBe(true);
    }
  });
});
