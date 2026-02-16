import { parseMetar } from "./test-utils";

describe("parseMetar", () => {
  test("parses variable wind (VRB)", () => {
    const metar = "EGLL 041350Z VRB03KT 9999 FEW020 15/08 Q1013";
    const parsed = parseMetar(metar);
    expect(parsed.wind).toBe("VRB at 03");
    expect(parsed.flightCategory).toBe("VFR");
  });

  test("parses CAVOK and altimeter in inHg", () => {
    const metar = "KJFK 041350Z 00000KT CAVOK 20/10 A2992";
    const parsed = parseMetar(metar);
    expect(parsed.visibility).toBe("CAVOK");
    expect(parsed.altimeter).toBe("29.92 inHg");
  });

  test("parses QNH in hPa", () => {
    const metar = "WSSS 041350Z 18008KT 8000 SCT020 28/24 Q1013";
    const parsed = parseMetar(metar);
    expect(parsed.altimeter).toBe("1013 hPa");
  });

  test("parses negative temps", () => {
    const metar = "KJFK 041350Z 00000KT 9999 M05/M07 Q1009";
    const parsed = parseMetar(metar);
    expect(parsed.temperature).toBe("-5°C");
    expect(parsed.dewpoint).toBe("-7°C");
  });
});
