import { describe, it, expect } from "vitest";
import {
  toIcaoCallsign,
  toDisplayFlightNumber,
  toIataAirlineCode,
} from "./airline-codes";

describe("toIcaoCallsign", () => {
  it("converts IATA UA745 to UAL745", () => {
    expect(toIcaoCallsign("UA745")).toBe("UAL745");
  });

  it("converts IATA DL123 to DAL123", () => {
    expect(toIcaoCallsign("DL123")).toBe("DAL123");
  });

  it("converts IATA AA100 to AAL100", () => {
    expect(toIcaoCallsign("AA100")).toBe("AAL100");
  });

  it("converts IATA WN1234 to SWA1234", () => {
    expect(toIcaoCallsign("WN1234")).toBe("SWA1234");
  });

  it("converts B6 (JetBlue) correctly", () => {
    expect(toIcaoCallsign("B6523")).toBe("JBU523");
  });

  it("passes through ICAO callsign UAL745 unchanged", () => {
    expect(toIcaoCallsign("UAL745")).toBe("UAL745");
  });

  it("passes through ICAO callsign DAL123 unchanged", () => {
    expect(toIcaoCallsign("DAL123")).toBe("DAL123");
  });

  it("passes through ICAO callsign SWA1234 unchanged", () => {
    expect(toIcaoCallsign("SWA1234")).toBe("SWA1234");
  });

  it("handles lowercase input", () => {
    expect(toIcaoCallsign("ua745")).toBe("UAL745");
    expect(toIcaoCallsign("ual745")).toBe("UAL745");
  });

  it("handles whitespace", () => {
    expect(toIcaoCallsign(" UA745 ")).toBe("UAL745");
    expect(toIcaoCallsign(" UAL745 ")).toBe("UAL745");
  });

  it("returns null for unknown airline code", () => {
    expect(toIcaoCallsign("ZZ999")).toBeNull();
    expect(toIcaoCallsign("ZZZ999")).toBeNull();
  });

  it("returns null for a bare airline code with no flight number", () => {
    expect(toIcaoCallsign("UA")).toBeNull();
    expect(toIcaoCallsign("UAL")).toBeNull();
    expect(toIcaoCallsign("")).toBeNull();
  });

  it("normalizes internal whitespace in the flight number", () => {
    expect(toIcaoCallsign("UA 745")).toBe("UAL745");
    expect(toIcaoCallsign("UAL 745")).toBe("UAL745");
  });

  it("converts international carriers", () => {
    expect(toIcaoCallsign("BA123")).toBe("BAW123");
    expect(toIcaoCallsign("LH456")).toBe("DLH456");
    expect(toIcaoCallsign("EK789")).toBe("UAE789");
    expect(toIcaoCallsign("QF11")).toBe("QFA11");
  });

  it("accepts ICAO international carriers", () => {
    expect(toIcaoCallsign("BAW123")).toBe("BAW123");
    expect(toIcaoCallsign("DLH456")).toBe("DLH456");
    expect(toIcaoCallsign("UAE789")).toBe("UAE789");
    expect(toIcaoCallsign("QFA11")).toBe("QFA11");
  });
});

describe("toDisplayFlightNumber", () => {
  it("returns IATA format as-is (uppercased)", () => {
    expect(toDisplayFlightNumber("UA745")).toBe("UA745");
  });

  it("converts ICAO to IATA for display", () => {
    expect(toDisplayFlightNumber("UAL745")).toBe("UA745");
    expect(toDisplayFlightNumber("DAL123")).toBe("DL123");
    expect(toDisplayFlightNumber("BAW456")).toBe("BA456");
  });

  it("handles lowercase", () => {
    expect(toDisplayFlightNumber("ual745")).toBe("UA745");
    expect(toDisplayFlightNumber("ua745")).toBe("UA745");
  });

  it("returns unknown codes as-is (uppercased)", () => {
    expect(toDisplayFlightNumber("ZZZ999")).toBe("ZZZ999");
  });

  it("normalizes internal and surrounding whitespace", () => {
    expect(toDisplayFlightNumber("UAL 745")).toBe("UA745");
    expect(toDisplayFlightNumber("UA 745")).toBe("UA745");
    expect(toDisplayFlightNumber(" ua745 ")).toBe("UA745");
  });
});

describe("toIataAirlineCode", () => {
  it("extracts the IATA code from an IATA flight number", () => {
    expect(toIataAirlineCode("UA745")).toBe("UA");
    expect(toIataAirlineCode("VY8102")).toBe("VY");
  });

  it("resolves the IATA code from an ICAO flight number", () => {
    expect(toIataAirlineCode("UAL745")).toBe("UA");
    expect(toIataAirlineCode("VLG8102")).toBe("VY");
  });

  it("handles alphanumeric IATA codes (cargo)", () => {
    expect(toIataAirlineCode("5X123")).toBe("5X");
  });

  it("handles lowercase and whitespace", () => {
    expect(toIataAirlineCode("vy 8102")).toBe("VY");
    expect(toIataAirlineCode(" ual745 ")).toBe("UA");
  });

  it("returns null for unknown airline codes", () => {
    expect(toIataAirlineCode("ZZ999")).toBeNull();
    expect(toIataAirlineCode("")).toBeNull();
  });
});
