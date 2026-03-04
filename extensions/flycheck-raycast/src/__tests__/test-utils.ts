/**
 * Test-only METAR parser used by unit tests.
 * Kept in a test helper so runtime code doesn't export test utilities.
 */
export function parseMetar(metar: string) {
  const tokens = metar.split(/\s+/);
  const result: Record<string, unknown> = {};

  // Wind (e.g. VRB03KT or 18008KT)
  const windToken = tokens.find((t) => /^(VRB|\d{3})\d{2}KT$/.test(t));
  if (windToken) {
    if (windToken.startsWith("VRB")) {
      const m = windToken.match(/^VRB(\d{2})KT$/);
      result.wind = m ? `VRB at ${m[1]}` : windToken;
    } else {
      const m = windToken.match(/^(\d{3})(\d{2})KT$/);
      result.wind = m ? `${parseInt(m[1], 10)}° at ${parseInt(m[2], 10)}` : windToken;
    }
  }

  // Visibility / flight category
  const visToken = tokens.find((t) => t === "CAVOK" || /^\d{4}$/.test(t));
  if (visToken) {
    result.visibility = visToken;
    if (visToken === "CAVOK" || visToken === "9999" || parseInt(visToken, 10) >= 5000) {
      result.flightCategory = "VFR";
    }
  }

  // Altimeter: A2992 -> 29.92 inHg ; Q1013 -> 1013 hPa
  const altToken = tokens.find((t) => /^A\d{4}$/.test(t) || /^Q\d{4}$/.test(t));
  if (altToken) {
    if (altToken.startsWith("A")) {
      const num = altToken.slice(1);
      const inches = `${num.slice(0, 2)}.${num.slice(2)}`;
      result.altimeter = `${inches} inHg`;
    } else if (altToken.startsWith("Q")) {
      result.altimeter = `${altToken.slice(1)} hPa`;
    }
  }

  // Temperature / dewpoint (e.g. 15/08 or M05/M07)
  const tempToken = tokens.find((t) => /^M?\d{2}\/M?\d{2}$/.test(t));
  if (tempToken) {
    const [t, d] = tempToken.split("/");
    const parseTemp = (s: string) => (s.startsWith("M") ? `-${parseInt(s.slice(1), 10)}°C` : `${parseInt(s, 10)}°C`);
    result.temperature = parseTemp(t);
    result.dewpoint = parseTemp(d);
  }

  return result;
}
