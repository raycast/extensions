import { describe, expect, it } from "vitest";
import { extractOrgnr, formatOrgnr, isValidOrgnr, parseOrgnr } from "../src/lib/orgnr";

describe("parseOrgnr", () => {
  it.each(["923609016", "923 609 016", "923.609.016", "NO923609016MVA", "no 923 609 016 mva", " 923-609-016 "])(
    "parses %s",
    (input) => expect(parseOrgnr(input)).toBe("923609016"),
  );

  it.each(["equinor", "92360901", "9236090161", "923609016 equinor"])("rejects %s", (input) =>
    expect(parseOrgnr(input)).toBeUndefined(),
  );
});

describe("isValidOrgnr", () => {
  it("accepts valid checksums", () => {
    expect(isValidOrgnr("923609016")).toBe(true);
    expect(isValidOrgnr("935108500")).toBe(true);
  });

  it("rejects invalid checksums", () => expect(isValidOrgnr("923609017")).toBe(false));
});

describe("extractOrgnr", () => {
  it("finds an org number in text", () => {
    expect(extractOrgnr("Faktura fra Equinor ASA, org.nr. 923 609 016 MVA")).toBe("923609016");
  });

  it("prefers a valid org number over another nine-digit number", () => {
    expect(extractOrgnr("Tlf 123456789, org 935108500")).toBe("935108500");
  });

  it("returns undefined without a candidate", () => expect(extractOrgnr("no numbers here")).toBeUndefined());
});

describe("formatOrgnr", () => {
  it("groups digits in threes", () => expect(formatOrgnr("923609016")).toBe("923 609 016"));
});
