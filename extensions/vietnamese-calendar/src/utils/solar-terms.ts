/**
 * Solar Terms (Tiết Khí) utility
 *
 * The 24 solar terms divide the ecliptic into 24 equal segments of 15°.
 * Each term starts when the Sun reaches a specific ecliptic longitude.
 * We calculate this using a compact solar longitude approximation.
 */

export interface SolarTerm {
  name: string; // Vietnamese name
  emoji: string;
  longitude: number; // Sun's ecliptic longitude at start (0–345, step 15)
}

export const SOLAR_TERMS: SolarTerm[] = [
  { name: "Xuân Phân", emoji: "🌸", longitude: 0 }, // Vernal Equinox (ref 0° but we start from Tiểu Hàn)
  { name: "Thanh Minh", emoji: "🌿", longitude: 15 },
  { name: "Cốc Vũ", emoji: "🌧️", longitude: 30 },
  { name: "Lập Hạ", emoji: "☀️", longitude: 45 },
  { name: "Tiểu Mãn", emoji: "🌾", longitude: 60 },
  { name: "Mang Chủng", emoji: "🌱", longitude: 75 },
  { name: "Hạ Chí", emoji: "🏖️", longitude: 90 },
  { name: "Tiểu Thử", emoji: "🌡️", longitude: 105 },
  { name: "Đại Thử", emoji: "🔥", longitude: 120 },
  { name: "Lập Thu", emoji: "🍂", longitude: 135 },
  { name: "Xử Thử", emoji: "🌬️", longitude: 150 },
  { name: "Bạch Lộ", emoji: "💧", longitude: 165 },
  { name: "Thu Phân", emoji: "🍁", longitude: 180 },
  { name: "Hàn Lộ", emoji: "🌫️", longitude: 195 },
  { name: "Sương Giáng", emoji: "❄️", longitude: 210 },
  { name: "Lập Đông", emoji: "🍃", longitude: 225 },
  { name: "Tiểu Tuyết", emoji: "🌨️", longitude: 240 },
  { name: "Đại Tuyết", emoji: "❄️", longitude: 255 },
  { name: "Đông Chí", emoji: "☃️", longitude: 270 },
  { name: "Tiểu Hàn", emoji: "🥶", longitude: 285 },
  { name: "Đại Hàn", emoji: "🌬️", longitude: 300 },
  { name: "Lập Xuân", emoji: "🌱", longitude: 315 },
  { name: "Vũ Thủy", emoji: "🌂", longitude: 330 },
  { name: "Kinh Trập", emoji: "🐛", longitude: 345 },
];

/**
 * Convert a Date to Julian Day Number
 */
function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440;

  const A = Math.floor((14 - m) / 12);
  const Y = y + 4800 - A;
  const M = m + 12 * A - 3;

  return (
    d +
    Math.floor((153 * M + 2) / 5) +
    365 * Y +
    Math.floor(Y / 4) -
    Math.floor(Y / 100) +
    Math.floor(Y / 400) -
    32045
  );
}

/**
 * Approximate Sun's ecliptic longitude for a given Julian Day Number.
 * Accurate to within ~1°, sufficient for identifying solar term days.
 * Based on Jean Meeus "Astronomical Algorithms" Ch.25 low-accuracy formula.
 */
function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0
  // Geometric mean longitude of the Sun (degrees)
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = ((L0 % 360) + 360) % 360;
  // Mean anomaly of the Sun (degrees)
  const M = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) + 360;
  const Mrad = (M * Math.PI) / 180;
  // Equation of center
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  // Sun's true longitude
  const lon = L0 + C;
  return ((lon % 360) + 360) % 360;
}

/**
 * Get the Solar Term that the given date falls within,
 * and how many days into that term it is (1-based).
 */
export function getSolarTerm(date: Date): { term: SolarTerm; day: number } {
  // Use noon UTC to avoid DST edge issues
  const noon = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0),
  );
  const jd = toJulianDay(noon);
  const lon = sunLongitude(jd);

  // Find which 15° sector we're in
  // The sector index maps to SOLAR_TERMS by longitude / 15
  const sectorIndex = Math.floor(lon / 15);
  const term = SOLAR_TERMS[sectorIndex];

  // Find exact start date of this term by stepping back to find when Sun crossed the sector boundary
  const sectorStart = sectorIndex * 15;

  // Binary search: find the JD when sun crossed sectorStart longitude
  // We know solar terms are ~15 days apart, so search within ±20 days
  let lo = jd - 20;
  let hi = jd;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const midLon = sunLongitude(mid);
    // Handle wraparound near 0°/360°
    let diff = midLon - sectorStart;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 0.0001) break;
    if (diff > 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const termStartJD = (lo + hi) / 2;
  const termStartDate = new Date(
    Date.UTC(1970, 0, 1) + (termStartJD - 2440587.5) * 86400000,
  );
  termStartDate.setUTCHours(0, 0, 0, 0);

  const dayInTerm =
    Math.floor(
      (noon.getTime() - termStartDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  return { term, day: Math.max(1, dayInTerm) };
}
