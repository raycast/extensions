import { isValidIcaoCode } from "../utils";

describe("isValidIcaoCode", () => {
  test("returns true for valid 4-letter ICAO codes", () => {
    expect(isValidIcaoCode("KJFK")).toBe(true);
    expect(isValidIcaoCode("EGLL")).toBe(true);
    expect(isValidIcaoCode("WSSS")).toBe(true);
  });

  test("returns false for codes that are too short", () => {
    expect(isValidIcaoCode("")).toBe(false);
    expect(isValidIcaoCode("K")).toBe(false);
    expect(isValidIcaoCode("KJ")).toBe(false);
    expect(isValidIcaoCode("KJF")).toBe(false);
  });

  test("returns false for codes that are too long", () => {
    expect(isValidIcaoCode("KJFK1")).toBe(false);
  });

  test("returns false for codes with numbers or special characters", () => {
    expect(isValidIcaoCode("KJF1")).toBe(false);
    expect(isValidIcaoCode("K-FK")).toBe(false);
    expect(isValidIcaoCode("JFK ")).toBe(false);
  });

  test("is case-insensitive and returns true for lowercase", () => {
    expect(isValidIcaoCode("kjfk")).toBe(true);
    expect(isValidIcaoCode("egll")).toBe(true);
  });
});