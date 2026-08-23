/**
 * Tithi (Lunar Day) Calculation
 *
 * A tithi is the time it takes the Moon's longitude to gain 12° on the Sun's.
 * There are 30 per synodic month — 15 in the waxing half (Shukla Paksha) and
 * 15 in the waning half (Krishna Paksha).
 *
 *     tithiIndex = floor( normalize360(moonLongitude - sunLongitude) / 12 )
 *
 * Because the tithi depends on the *difference* of the two longitudes, the
 * sidereal offset (ayanamsa) cancels out — it shifts both bodies equally.
 * No ayanamsa constant is needed here. (It would be, for nakshatra or rashi.)
 *
 * Nepali panchang convention: the tithi prevailing at *sunrise* is the tithi
 * of that whole day, even if it rolls over later in the day. All lookups are
 * therefore evaluated at sunrise in Kathmandu.
 *
 * Algorithms: Jean Meeus, "Astronomical Algorithms" (2nd ed.)
 *   - Solar longitude: ch. 25 (low precision)
 *   - Lunar longitude: ch. 47, truncated ELP-2000/82 series
 */

import { BsDate, bsToAd } from "./nepali-date";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Kathmandu — the reference location for the Nepali panchang. */
const KATHMANDU_LAT = 27.7172;
const KATHMANDU_LNG = 85.324;

/** Nepal Standard Time is UTC+05:45. */
const NPT_OFFSET_MINUTES = 5 * 60 + 45;

const DEG = Math.PI / 180;

export const TITHI_NAMES = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
] as const;

export const TITHI_NAMES_NP = [
  "प्रतिपदा",
  "द्वितीया",
  "तृतीया",
  "चतुर्थी",
  "पञ्चमी",
  "षष्ठी",
  "सप्तमी",
  "अष्टमी",
  "नवमी",
  "दशमी",
  "एकादशी",
  "द्वादशी",
  "त्रयोदशी",
  "चतुर्दशी",
] as const;

// ─── Angle Helpers ──────────────────────────────────────────────────────────

function normalize360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

const sinDeg = (d: number) => Math.sin(d * DEG);
const cosDeg = (d: number) => Math.cos(d * DEG);

// ─── Julian Day ─────────────────────────────────────────────────────────────

/** Julian Day for a Gregorian calendar date at 00:00 UT. */
function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5
  );
}

/** Julian centuries since J2000.0. */
function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

// ─── Solar Longitude (Meeus ch. 25) ─────────────────────────────────────────

/** Apparent geocentric longitude of the Sun, in degrees. */
function solarLongitude(jd: number): number {
  const T = julianCenturies(jd);

  // Geometric mean longitude
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;

  // Mean anomaly
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;

  // Equation of the center
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M) +
    (0.019993 - 0.000101 * T) * sinDeg(2 * M) +
    0.000289 * sinDeg(3 * M);

  const trueLongitude = L0 + C;

  // Longitude of the ascending node of the Moon's mean orbit — drives the
  // dominant nutation term.
  const omega = 125.04 - 1934.136 * T;

  // Apparent longitude: correct for nutation and aberration.
  return normalize360(trueLongitude - 0.00569 - 0.00478 * sinDeg(omega));
}

// ─── Lunar Longitude (Meeus ch. 47) ─────────────────────────────────────────

/**
 * Periodic terms for the Moon's longitude (Meeus Table 47.A).
 * Columns: [D, M, M', F, coefficient in 1e-6 degrees]
 */
const MOON_LONGITUDE_TERMS: readonly [
  number,
  number,
  number,
  number,
  number,
][] = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595],
  [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810],
  [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713],
  [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549],
  [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520],
  [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351],
  [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330],
  [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299],
  [2, 0, 3, 0, 294],
];

/** Apparent geocentric longitude of the Moon, in degrees. */
function lunarLongitude(jd: number): number {
  const T = julianCenturies(jd);
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Moon's mean longitude
  const Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T2 +
    T3 / 538841 -
    T4 / 65194000;

  // Mean elongation of the Moon from the Sun
  const D =
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T2 +
    T3 / 545868 -
    T4 / 113065000;

  // Sun's mean anomaly
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;

  // Moon's mean anomaly
  const Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T2 +
    T3 / 69699 -
    T4 / 14712000;

  // Moon's argument of latitude
  const F =
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T2 -
    T3 / 3526000 +
    T4 / 863310000;

  // Additive arguments from the action of Venus, Jupiter, and flattening.
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;

  // Eccentricity correction — terms in M are scaled by the Earth's changing
  // orbital eccentricity.
  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  let sumL = 0;
  for (const [d, m, mp, f, coeff] of MOON_LONGITUDE_TERMS) {
    let term = coeff * sinDeg(d * D + m * M + mp * Mp + f * F);
    const absM = Math.abs(m);
    if (absM === 1) term *= E;
    else if (absM === 2) term *= E * E;
    sumL += term;
  }

  // Additive corrections (Meeus p. 342)
  sumL += 3958 * sinDeg(A1);
  sumL += 1962 * sinDeg(Lp - F);
  sumL += 318 * sinDeg(A2);

  // A3 participates only in the latitude series; referenced to keep the
  // argument set complete and match Meeus' notation.
  void A3;

  const geometric = Lp + sumL / 1000000;

  // Apply the same dominant nutation term used for the Sun so the two
  // longitudes share a reference frame and the difference stays clean.
  const omega = 125.04 - 1934.136 * T;
  return normalize360(geometric - 0.00478 * sinDeg(omega));
}

// ─── Sunrise ────────────────────────────────────────────────────────────────

/**
 * Julian Day of sunrise at Kathmandu for the given Gregorian date.
 * Standard sunrise equation; accurate to well under a minute, which is far
 * finer than the ~2 hours a tithi lasts at minimum.
 */
function kathmanduSunriseJd(year: number, month: number, day: number): number {
  const jd = julianDay(year, month, day);

  // Days since J2000, adjusted for the observer's longitude.
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const meanSolarNoon = n - KATHMANDU_LNG / 360;

  const M = normalize360(357.5291 + 0.98560028 * meanSolarNoon);
  const C = 1.9148 * sinDeg(M) + 0.02 * sinDeg(2 * M) + 0.0003 * sinDeg(3 * M);
  const lambda = normalize360(M + C + 180 + 102.9372);

  const solarTransit =
    2451545.0 +
    meanSolarNoon +
    0.0053 * sinDeg(M) -
    0.0069 * sinDeg(2 * lambda);

  const declination = Math.asin(sinDeg(lambda) * sinDeg(23.4397)) / DEG;

  // -0.833° accounts for refraction and the solar disc's radius.
  const cosHourAngle =
    (sinDeg(-0.833) - sinDeg(KATHMANDU_LAT) * sinDeg(declination)) /
    (cosDeg(KATHMANDU_LAT) * cosDeg(declination));

  // Kathmandu is far from the poles, so the sun always rises; clamp only to
  // guard against floating-point overshoot at the boundary.
  const clamped = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngle = Math.acos(clamped) / DEG;

  return solarTransit - hourAngle / 360;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export type Paksha = "Shukla" | "Krishna";

export interface Tithi {
  /** 0–29 across the full synodic month. */
  index: number;
  /** 1–15 within the paksha. */
  num: number;
  name: string;
  nameNp: string;
  paksha: Paksha;
  pakshaNp: string;
  /** True for tithis that carry an observance (Ekadashi, Purnima, etc.). */
  isSpecial: boolean;
  /** Short description of the observance, when there is one. */
  observance?: string;
  /** Moon-phase glyph matching this tithi. */
  moonIcon: string;
}

/** Build a Tithi from its 0–29 index. */
function buildTithi(index: number): Tithi {
  const paksha: Paksha = index < 15 ? "Shukla" : "Krishna";
  const pakshaNp = index < 15 ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
  const num = (index % 15) + 1;

  // The 15th tithi of each paksha is a named full/new moon rather than an
  // ordinal — Purnima closes the waxing half, Aunsi closes the waning half.
  let name: string;
  let nameNp: string;
  if (num === 15) {
    name = paksha === "Shukla" ? "Purnima" : "Aunsi";
    nameNp = paksha === "Shukla" ? "पूर्णिमा" : "औंसी";
  } else {
    name = TITHI_NAMES[num - 1];
    nameNp = TITHI_NAMES_NP[num - 1];
  }

  const observance = getObservance(name);

  return {
    index,
    num,
    name,
    nameNp,
    paksha,
    pakshaNp,
    isSpecial: observance !== undefined,
    observance,
    moonIcon: getMoonIcon(index),
  };
}

/**
 * Moon-phase glyph for a tithi index. The waxing half runs new -> full,
 * the waning half full -> new, so the glyph tracks illumination directly.
 */
function getMoonIcon(index: number): string {
  const phases = [
    "\u{1F311}",
    "\u{1F312}",
    "\u{1F313}",
    "\u{1F314}",
    "\u{1F315}",
    "\u{1F316}",
    "\u{1F317}",
    "\u{1F318}",
  ];
  // Map 0-29 onto the eight glyphs around the full cycle.
  return phases[Math.round((index / 30) * 8) % 8];
}

/** Observance attached to a tithi name, if any. */
function getObservance(name: string): string | undefined {
  switch (name) {
    case "Ekadashi":
      return "Ekadashi Vrat — fasting day";
    case "Purnima":
      return "Full moon";
    case "Aunsi":
      return "New moon — Aunsi";
    case "Ashtami":
      return "Ashtami";
    case "Chaturdashi":
      return "Chaturdashi";
    default:
      return undefined;
  }
}

/** Tithi in effect at a specific instant. */
export function getTithiAtInstant(jd: number): Tithi {
  const elongation = normalize360(lunarLongitude(jd) - solarLongitude(jd));
  return buildTithi(Math.floor(elongation / 12));
}

/**
 * Tithi for an explicit Gregorian calendar date, evaluated at Kathmandu
 * sunrise per panchang convention.
 *
 * Takes calendar components rather than a Date so the result cannot shift
 * with the host's timezone.
 */
export function getTithiForGregorian(
  year: number,
  month: number,
  day: number,
): Tithi {
  return getTithiAtInstant(kathmanduSunriseJd(year, month, day));
}

/**
 * Tithi for a Bikram Sambat date.
 *
 * bsToAd returns a host-local date whose *local* components are the intended
 * calendar date, so they are read directly. Converting through UTC here would
 * select the previous day on any host east of NPT (+05:45).
 */
export function getTithiForBsDate(bs: BsDate): Tithi {
  const ad = bsToAd(bs.year, bs.month, bs.day);
  return getTithiForGregorian(
    ad.getFullYear(),
    ad.getMonth() + 1,
    ad.getDate(),
  );
}

/**
 * Tithi for the Nepali day in progress at the given instant.
 *
 * Unlike getTithiForBsDate this genuinely is a point in time, so it is shifted
 * into Kathmandu's offset to find which Nepali calendar day is current there.
 */
export function getTithiForDate(date: Date): Tithi {
  const npt = new Date(date.getTime() + NPT_OFFSET_MINUTES * 60000);
  return getTithiForGregorian(
    npt.getUTCFullYear(),
    npt.getUTCMonth() + 1,
    npt.getUTCDate(),
  );
}

/** Tithi for the Nepali day currently in progress in Kathmandu. */
export function getCurrentTithi(): Tithi {
  return getTithiForDate(new Date());
}

/** Moon–Sun elongation in degrees — exposed for verification. */
export function getElongation(jd: number): number {
  return normalize360(lunarLongitude(jd) - solarLongitude(jd));
}

/** Julian Day for an arbitrary instant — exposed for verification. */
export function julianDayFromDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
