// Ported from 28LunarMansionGuide/index.html (Meeus Ch.47 truncation, ±1-2°).
// Do not retune constants without cross-validating 3 dates vs Stellarium/AstroSeek.
import { ARAB_THEMES, BRANCHES, NAKSHATRAS, NakshatraInfo, STEMS, XIU, XiuInfo } from "./systems";

export interface Mansion {
  num: number;
  name: string;
  deg: string;
  divineName: string;
  rating: string;
  theme: string;
}

export const MANSIONS: Omit<Mansion, "theme">[] = [
  {
    num: 1,
    name: "Al-Sharatain",
    deg: "Aries 0°–12°51'",
    divineName: "Al-Badi",
    rating: "Caution",
  },
  {
    num: 2,
    name: "Al-Butain",
    deg: "Aries 12°51'–25°42'",
    divineName: "Al-Ba'ith",
    rating: "Good",
  },
  {
    num: 3,
    name: "Al-Thurayya",
    deg: "Aries 25°42'–Taurus 8°34'",
    divineName: "Al-Batin",
    rating: "Prime ✦✦",
  },
  {
    num: 4,
    name: "Al-Dabaran",
    deg: "Taurus 8°34'–21°25'",
    divineName: "Al-Akhir",
    rating: "Absolute Veto",
  },
  {
    num: 5,
    name: "Al-Hak'ah",
    deg: "Taurus 21°25'–Gemini 4°17'",
    divineName: "Al-Zahir",
    rating: "Good",
  },
  {
    num: 6,
    name: "Al-Han'ah",
    deg: "Gemini 4°17'–17°8'",
    divineName: "Al-Hakim",
    rating: "Prime ✦✦",
  },
  {
    num: 7,
    name: "Al-Dhira'",
    deg: "Gemini 17°8'–Cancer 0°",
    divineName: "Al-Muhit",
    rating: "Prime ✦✦",
  },
  {
    num: 8,
    name: "Al-Nathrah",
    deg: "Cancer 0°–12°51'",
    divineName: "Al-Shakur",
    rating: "Highest ✦✦✦",
  },
  {
    num: 9,
    name: "Al-Tarf",
    deg: "Cancer 12°51'–25°42'",
    divineName: "Al-Ghani",
    rating: "Avoid",
  },
  {
    num: 10,
    name: "Al-Jabhah",
    deg: "Cancer 25°42'–Leo 8°34'",
    divineName: "Al-Muqtadir",
    rating: "Prime ✦✦",
  },
  {
    num: 11,
    name: "Al-Zubrah",
    deg: "Leo 8°34'–21°25'",
    divineName: "Al-Rabb",
    rating: "Highest ✦✦✦",
  },
  {
    num: 12,
    name: "Al-Sarfah",
    deg: "Leo 21°25'–Virgo 4°17'",
    divineName: "Al-'Alim",
    rating: "Avoid",
  },
  {
    num: 13,
    name: "Al-Awwa",
    deg: "Virgo 4°17'–17°8'",
    divineName: "Al-Qahhar",
    rating: "Prime ✦✦",
  },
  {
    num: 14,
    name: "Al-Simak",
    deg: "Virgo 17°8'–30°",
    divineName: "Al-Nur",
    rating: "Highest ✦✦✦",
  },
  {
    num: 15,
    name: "Al-Ghafr",
    deg: "Libra 0°–12°51'",
    divineName: "Al-Musawwir",
    rating: "Prime ✦✦",
  },
  {
    num: 16,
    name: "Al-Zubana",
    deg: "Libra 12°51'–25°42'",
    divineName: "Al-Muhsi",
    rating: "Avoid",
  },
  {
    num: 17,
    name: "Al-Iklil",
    deg: "Libra 25°42'–Scorpio 8°34'",
    divineName: "Al-Mubin",
    rating: "Prime ✦✦",
  },
  {
    num: 18,
    name: "Al-Qalb",
    deg: "Scorpio 8°34'–21°25'",
    divineName: "Al-Qabid",
    rating: "Absolute Veto",
  },
  {
    num: 19,
    name: "Al-Shaulah",
    deg: "Scorpio 21°25'–Sag 4°17'",
    divineName: "Al-Hayy",
    rating: "Avoid",
  },
  {
    num: 20,
    name: "Al-Na'aim",
    deg: "Sag 4°17'–17°8'",
    divineName: "Al-Muhyi",
    rating: "Good",
  },
  {
    num: 21,
    name: "Al-Baldah",
    deg: "Sag 17°8'–30°",
    divineName: "Al-Mumit",
    rating: "Caution",
  },
  {
    num: 22,
    name: "Sa'd al-Dhabih",
    deg: "Cap 0°–12°51'",
    divineName: "Al-'Aziz",
    rating: "Prime ✦✦",
  },
  {
    num: 23,
    name: "Sa'd Bula'",
    deg: "Cap 12°51'–25°42'",
    divineName: "Al-Razzaq",
    rating: "Prime ✦✦",
  },
  {
    num: 24,
    name: "Sa'd al-Su'ud",
    deg: "Cap 25°42'–Aqu 8°34'",
    divineName: "Al-Mudhill",
    rating: "Good",
  },
  {
    num: 25,
    name: "Sa'd al-Akhbiyah",
    deg: "Aqu 8°34'–21°25'",
    divineName: "Al-Qawiyy",
    rating: "Caution",
  },
  {
    num: 26,
    name: "Al-Fargh al-Awwal",
    deg: "Aqu 21°25'–Pis 4°17'",
    divineName: "Al-Latif",
    rating: "Prime ✦✦",
  },
  {
    num: 27,
    name: "Al-Fargh al-Thani",
    deg: "Pis 4°17'–17°8'",
    divineName: "Al-Jami'",
    rating: "Highest ✦✦✦",
  },
  {
    num: 28,
    name: "Al-Batn al-Hut",
    deg: "Pis 17°8'–30°",
    divineName: "Rafi' al-Darajat",
    rating: "Prime ✦✦",
  },
];

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

export function toJD(year: number, month: number, day: number, hour = 12): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5;
}

export function moonLon(jd: number): number {
  const d = jd - 2451545.0;
  const r = Math.PI / 180;
  const L = (((218.316 + 13.176396 * d) % 360) + 360) % 360;
  const M = (((134.963 + 13.064993 * d) % 360) + 360) % 360;
  const F = (((93.272 + 13.22935 * d) % 360) + 360) % 360;
  const D = (((297.85 + 12.190749 * d) % 360) + 360) % 360;
  const Ms = (((357.529 + 0.9856 * d) % 360) + 360) % 360;
  const lon =
    L +
    6.289 * Math.sin(M * r) +
    1.274 * Math.sin((2 * D - M) * r) +
    0.658 * Math.sin(2 * D * r) +
    0.214 * Math.sin(2 * M * r) -
    0.186 * Math.sin(Ms * r) -
    0.114 * Math.sin(2 * F * r) +
    0.059 * Math.sin((2 * D - 2 * M) * r) +
    0.057 * Math.sin((2 * D - Ms - M) * r);
  return ((lon % 360) + 360) % 360;
}

export function sunLon(jd: number): number {
  const d = jd - 2451545.0;
  const T = d / 36525;
  const r = Math.PI / 180;
  const L0 = (((280.46646 + 36000.76983 * T) % 360) + 360) % 360;
  const M = (((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) + 360) % 360;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * r) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * r) +
    0.000289 * Math.sin(3 * M * r);
  return (((L0 + C) % 360) + 360) % 360;
}

export function lonToMansion(lon: number): number {
  return (Math.floor(lon / (360 / 28)) % 28) + 1;
}

// ─── Planets: JPL approximate Keplerian elements (J2000 + rate/century) ───
// Good to ~arcminutes for sign + degree display. Same math family as IbnArbi.
interface Elements {
  a: number;
  e: number;
  I: number;
  L: number;
  lp: number;
  om: number;
  da: number;
  de: number;
  dI: number;
  dL: number;
  dlp: number;
  dom: number;
}

const ORBITS: Record<string, Elements> = {
  Mercury: {
    a: 0.38709927,
    e: 0.20563593,
    I: 7.00497902,
    L: 252.2503235,
    lp: 77.45779628,
    om: 48.33076593,
    da: 0.00000037,
    de: 0.00001906,
    dI: -0.00594749,
    dL: 149472.67411175,
    dlp: 0.16047689,
    dom: -0.12534081,
  },
  Venus: {
    a: 0.72333566,
    e: 0.00677672,
    I: 3.39467605,
    L: 181.9790995,
    lp: 131.60246718,
    om: 76.67984255,
    da: 0.0000039,
    de: -0.00004107,
    dI: -0.0007889,
    dL: 58517.81538729,
    dlp: 0.00268329,
    dom: -0.27769418,
  },
  Earth: {
    a: 1.00000261,
    e: 0.01671123,
    I: -0.00001531,
    L: 100.46457166,
    lp: 102.93768193,
    om: 0,
    da: 0.00000562,
    de: -0.00004392,
    dI: -0.01294668,
    dL: 35999.37244981,
    dlp: 0.32327364,
    dom: 0,
  },
  Mars: {
    a: 1.52371034,
    e: 0.0933941,
    I: 1.84969142,
    L: -4.55343205,
    lp: -23.94362959,
    om: 49.55953891,
    da: 0.00001847,
    de: 0.00007882,
    dI: -0.00813131,
    dL: 19140.30268499,
    dlp: 0.44441088,
    dom: -0.29257343,
  },
  Jupiter: {
    a: 5.202887,
    e: 0.04838624,
    I: 1.30439695,
    L: 34.39644051,
    lp: 14.72847983,
    om: 100.47390909,
    da: -0.00011607,
    de: -0.00013253,
    dI: -0.00183714,
    dL: 3034.74612775,
    dlp: 0.21252668,
    dom: 0.20469106,
  },
  Saturn: {
    a: 9.53667594,
    e: 0.05386179,
    I: 2.48599187,
    L: 49.95424423,
    lp: 92.59887831,
    om: 113.66242448,
    da: -0.0012506,
    de: -0.00050991,
    dI: 0.00193609,
    dL: 1222.49362201,
    dlp: -0.41897216,
    dom: -0.28867794,
  },
};

function helio(name: string, T: number): [number, number, number] {
  const r = Math.PI / 180;
  const el = ORBITS[name];
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = (el.I + el.dI * T) * r;
  const L = el.L + el.dL * T;
  const lp = el.lp + el.dlp * T;
  const om = (el.om + el.dom * T) * r;
  const w = ((lp - (el.om + el.dom * T)) % 360) * r;
  const M = (((L - lp) % 360) + 360) % 360;
  let E = M + (180 / Math.PI) * e * Math.sin(M * r);
  for (let k = 0; k < 12; k++) E -= (E - (180 / Math.PI) * e * Math.sin(E * r) - M) / (1 - e * Math.cos(E * r));
  const xp = a * (Math.cos(E * r) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E * r);
  const cw = Math.cos(w),
    sw = Math.sin(w),
    co = Math.cos(om),
    so = Math.sin(om),
    ci = Math.cos(I),
    si = Math.sin(I);
  return [
    (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
    (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

function planetLon(name: string, jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const [xe, ye] = helio("Earth", T);
  const [xp, yp] = helio(name, T);
  return ((((Math.atan2(yp - ye, xp - xe) * 180) / Math.PI) % 360) + 360) % 360;
}

export interface PlanetPosition {
  name: string;
  symbol: string;
  sign: string;
  deg: string;
  motion: string;
}

// Emoji only — the ☉☾☿♀♂♃♄ glyphs do not render in Raycast's menu font.
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☀️",
  Moon: "🌙",
  Mercury: "💫",
  Venus: "💖",
  Mars: "🔴",
  Jupiter: "🟠",
  Saturn: "🪐",
};

function degStr(lon: number): string {
  const d = lon % 30;
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}'`;
}

function planetRow(name: string, lon: number, jd: number): PlanetPosition {
  let motion = "Direct";
  if (name !== "Sun" && name !== "Moon") {
    const dl = ((((planetLon(name, jd + 1) - lon) % 360) + 540) % 360) - 180;
    motion = dl < 0 ? "Retrograde" : "Direct";
  }
  return {
    name,
    symbol: PLANET_SYMBOLS[name],
    sign: SIGNS[Math.floor(lon / 30) % 12],
    deg: degStr(lon),
    motion,
  };
}

export interface Calendars {
  hijri: string;
  cnDay: string;
  cnDaySub: string;
  cnDayEmoji: string;
  cnMonth: string;
  cnMonthSub: string;
  cnMonthEmoji: string;
  tithi: string;
  masa: string;
  vara: string;
}

export interface MoonInfo {
  phaseName: string;
  emoji: string;
  illumPct: number;
  age: number;
  zodiac: string;
  longitude: number;
  mansion: Mansion;
  nakshatra: NakshatraInfo;
  xiu: XiuInfo;
  planets: PlanetPosition[];
  cal: Calendars;
}

// ─── Calendars: Hijri (Intl islamic, tabular ±1d), Chinese pillars (ported ───
// from IbnArbi/lib/chinese-astro.ts), Vedic tithi/masa/vara.
function jdn(date: Date): number {
  const y = date.getFullYear(),
    m = date.getMonth() + 1,
    d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

const SOLAR_MONTH_STARTS: [number, number][] = [
  [2, 4],
  [3, 6],
  [4, 5],
  [5, 6],
  [6, 6],
  [7, 7],
  [8, 7],
  [9, 8],
  [10, 8],
  [11, 7],
  [12, 7],
  [1, 6],
];

function chineseMonthIdx(month: number, day: number): number {
  for (let i = SOLAR_MONTH_STARTS.length - 1; i >= 0; i--) {
    const [sm, sd] = SOLAR_MONTH_STARTS[i];
    if (sm === 1) {
      if (month === 1 && day >= sd) return 11;
      if (month === 12 && day >= 7) return 10;
    } else if (month > sm || (month === sm && day >= sd)) {
      return i;
    }
  }
  return 10; // Jan 1–5 still belongs to the Rat month
}

const TITHI_NAMES = [
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
  "Purnima",
];
const MASA_NAMES = [
  "Ashwina",
  "Kartika",
  "Margashirsha",
  "Pausha",
  "Magha",
  "Phalguna",
  "Chaitra",
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadrapada",
];
const VARA_NAMES: Record<string, string> = {
  Sun: "Ravivara",
  Moon: "Somavara",
  Mars: "Mangalavara",
  Mercury: "Budhavara",
  Jupiter: "Guruvara",
  Venus: "Shukravara",
  Saturn: "Shanivara",
};
const DAY_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

function getCalendars(date: Date, angle: number, sunSid: number): Calendars {
  let hijri = "—";
  try {
    hijri = new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    /* keep placeholder */
  }

  const sex = (((jdn(date) + 49) % 60) + 60) % 60;
  const dstem = STEMS[sex % 10],
    dbranch = BRANCHES[sex % 12];
  const month = date.getMonth() + 1,
    day = date.getDate();
  let cnYear = date.getFullYear();
  if (month < 2 || (month === 2 && day < 4)) cnYear -= 1;
  const yStem = (((cnYear - 4) % 10) + 10) % 10;
  const midx = chineseMonthIdx(month, day);
  const mstem = STEMS[((yStem % 5) * 2 + 2 + midx) % 10],
    mbranch = BRANCHES[(midx + 2) % 12];

  const ti = Math.floor(angle / 12) % 30;
  const paksha = ti < 15 ? "Shukla" : "Krishna";
  const tithi = ti === 29 ? "Amavasya" : `${paksha} ${TITHI_NAMES[ti % 15]}`;
  const fullSid = (sunSid + 180) % 360;
  const masa = MASA_NAMES[Math.floor(((((fullSid - 346.67) % 360) + 360) % 360) / 30) % 12] + " (approx)";
  const varaPlanet = DAY_PLANETS[date.getDay()];
  const vara = VARA_NAMES[varaPlanet];

  return {
    hijri,
    cnDay: `${dstem.zh}${dbranch.zh} ${dbranch.animal}`,
    cnDaySub: `${dstem.name}-${dbranch.name} day`,
    cnDayEmoji: dbranch.emoji,
    cnMonth: `${mstem.zh}${mbranch.zh} ${mbranch.animal}`,
    cnMonthSub: `${mstem.name}-${mbranch.name} month`,
    cnMonthEmoji: mbranch.emoji,
    tithi,
    masa,
    vara,
  };
}

export function getMoonInfo(date = new Date()): MoonInfo {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const mLon = moonLon(jd);
  const sLon = sunLon(jd);
  const angle = (((mLon - sLon) % 360) + 360) % 360;
  const illumPct = ((1 - Math.cos(angle * (Math.PI / 180))) / 2) * 100;
  const age = (angle / 360) * 29.53058867;

  let phaseName: string;
  let emoji: string;
  if (angle < 22.5) {
    emoji = "🌑";
    phaseName = "New Moon";
  } else if (angle < 67.5) {
    emoji = "🌒";
    phaseName = "Waxing Crescent";
  } else if (angle < 112.5) {
    emoji = "🌓";
    phaseName = "First Quarter";
  } else if (angle < 157.5) {
    emoji = "🌔";
    phaseName = "Waxing Gibbous";
  } else if (angle < 202.5) {
    emoji = "🌕";
    phaseName = "Full Moon";
  } else if (angle < 247.5) {
    emoji = "🌖";
    phaseName = "Waning Gibbous";
  } else if (angle < 292.5) {
    emoji = "🌗";
    phaseName = "Last Quarter";
  } else if (angle < 337.5) {
    emoji = "🌘";
    phaseName = "Waning Crescent";
  } else {
    emoji = "🌑";
    phaseName = "New Moon";
  }

  const base = MANSIONS[lonToMansion(mLon) - 1];
  const mansion: Mansion = { ...base, theme: ARAB_THEMES[base.num] };

  // Sidereal systems share IbnArbi's Lahiri approximation
  // (AYANAMSHA_J2000 23.85 + 0.01397°/yr). Vedic nakshatras are exact equal
  // 27ths from 0° sidereal Aries. Chinese xiu are APPROXIMATE equal 28ths
  // anchored at Horn (Spica ≈ 180° sidereal) — true lodge widths are unequal.
  const yearsSinceJ2000 = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
  const ayanamsa = 23.85 + 0.01397 * yearsSinceJ2000;
  const sidereal = (((mLon - ayanamsa) % 360) + 360) % 360;
  const sunSid = (((sLon - ayanamsa) % 360) + 360) % 360;
  const nakshatra = NAKSHATRAS[Math.floor(sidereal / (360 / 27)) % 27];
  const xiuSlice = ((((sidereal - 180) % 360) + 360) % 360) / (360 / 28);
  const xiu = XIU[Math.floor(xiuSlice) % 28];

  const planets: PlanetPosition[] = [
    planetRow("Sun", sLon, jd),
    planetRow("Moon", mLon, jd),
    planetRow("Mercury", planetLon("Mercury", jd), jd),
    planetRow("Venus", planetLon("Venus", jd), jd),
    planetRow("Mars", planetLon("Mars", jd), jd),
    planetRow("Jupiter", planetLon("Jupiter", jd), jd),
    planetRow("Saturn", planetLon("Saturn", jd), jd),
  ];

  return {
    phaseName,
    emoji,
    illumPct,
    age,
    zodiac: SIGNS[Math.floor(mLon / 30) % 12],
    longitude: mLon,
    mansion,
    nakshatra,
    xiu,
    planets,
    cal: getCalendars(date, angle, sunSid),
  };
}
