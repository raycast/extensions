/* Standalone sanity check for the VAT generators.
 * Independently re-validates checksum-tier numbers and confirms format-tier
 * numbers match their expected length/pattern. Run via the project's tsc. */
import { COUNTRIES, generateVat, Country } from "../src/lib/countries";

function digits(s: string): number[] {
  return s.split("").map((c) => Number(c));
}

const validators: Record<string, (full: string) => boolean> = {
  NL: (f) => {
    const m = /^NL(\d{9})B\d{2}$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    const sum = d.slice(0, 8).reduce((a, x, i) => a + x * (9 - i), 0) - d[8];
    return sum % 11 === 0;
  },
  DE: (f) => {
    const m = /^DE(\d{9})$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    let p = 10;
    for (let i = 0; i < 8; i++) {
      let s = (d[i] + p) % 10;
      if (s === 0) s = 10;
      p = (s * 2) % 11;
    }
    return (11 - p) % 10 === d[8];
  },
  BE: (f) => {
    const m = /^BE(\d{10})$/.exec(f);
    if (!m) return false;
    const first8 = Number(m[1].slice(0, 8));
    const check = Number(m[1].slice(8));
    return 97 - (first8 % 97) === check;
  },
  FR: (f) => {
    const m = /^FR(\d{2})(\d{9})$/.exec(f);
    if (!m) return false;
    const key = Number(m[1]);
    const siren = m[2];
    // SIREN Luhn
    const d = digits(siren);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let x = d[8 - i];
      if (i % 2 === 1) {
        x *= 2;
        if (x > 9) x -= 9;
      }
      sum += x;
    }
    const luhnOk = sum % 10 === 0;
    const keyOk = (12 + 3 * (Number(siren) % 97)) % 97 === key;
    return luhnOk && keyOk;
  },
  IT: (f) => {
    const m = /^IT(\d{11})$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      let x = d[10 - i];
      if (i % 2 === 1) {
        x *= 2;
        if (x > 9) x -= 9;
      }
      sum += x;
    }
    return sum % 10 === 0;
  },
  ES: (f) => {
    const m = /^ESA(\d{8})$/.exec(f);
    if (!m) return false;
    const body = m[1].slice(0, 7);
    const control = Number(m[1].slice(7));
    const d = digits(body);
    let sum = 0;
    d.forEach((x, i) => {
      if ((i + 1) % 2 === 1) {
        const dd = x * 2;
        sum += dd > 9 ? dd - 9 : dd;
      } else sum += x;
    });
    return (10 - (sum % 10)) % 10 === control;
  },
  LU: (f) => {
    const m = /^LU(\d{8})$/.exec(f);
    if (!m) return false;
    return Number(m[1].slice(0, 6)) % 89 === Number(m[1].slice(6));
  },
  PL: (f) => {
    const m = /^PL(\d{10})$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const sum = w.reduce((a, x, i) => a + x * d[i], 0);
    return sum % 11 === d[9];
  },
  SE: (f) => {
    const m = /^SE(\d{10})01$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      let x = d[9 - i];
      if (i % 2 === 1) {
        x *= 2;
        if (x > 9) x -= 9;
      }
      sum += x;
    }
    return sum % 10 === 0;
  },
  FI: (f) => {
    const m = /^FI(\d{8})$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    const w = [7, 9, 10, 5, 8, 4, 2];
    const r = w.reduce((a, x, i) => a + x * d[i], 0) % 11;
    const check = r === 0 ? 0 : 11 - r;
    return r !== 1 && check === d[7];
  },
  DK: (f) => {
    const m = /^DK(\d{8})$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    const w = [2, 7, 6, 5, 4, 3, 2, 1];
    const sum = w.reduce((a, x, i) => a + x * d[i], 0);
    return sum % 11 === 0;
  },
  PT: (f) => {
    const m = /^PT(\d{9})$/.exec(f);
    if (!m) return false;
    const d = digits(m[1]);
    const w = [9, 8, 7, 6, 5, 4, 3, 2];
    const r = w.reduce((a, x, i) => a + x * d[i], 0) % 11;
    const check = r < 2 ? 0 : 11 - r;
    return check === d[8];
  },
};

const formatLengths: Record<string, number> = {
  AT: 11,
  BG: 11,
  HR: 13,
  CY: 11,
  CZ: 10,
  EE: 11,
  GR: 11,
  HU: 10,
  IE: 11,
  LV: 13,
  LT: 11,
  MT: 10,
  RO: 11,
  SK: 12,
  SI: 10,
  GB: 11,
  CH: 12,
  NO: 14,
  AU: 11,
  CA: 15,
  NZ: 9,
  ZA: 10,
  RU: 10,
  IN: 15,
  JP: 14,
  KR: 10,
  SG: 10,
  AE: 15,
  SA: 15,
  MX: 12,
  BR: 14,
  TR: 10,
  UA: 12,
};

let failures = 0;
const ITER = 500;

for (const country of COUNTRIES) {
  for (let i = 0; i < ITER; i++) {
    const full = generateVat(country);
    if (country.tier === "checksum") {
      const v = validators[country.code];
      if (!v) {
        console.error(`No validator for checksum country ${country.code}`);
        failures++;
        break;
      }
      if (!v(full)) {
        console.error(`CHECKSUM FAIL ${country.code}: ${full}`);
        failures++;
        break;
      }
    } else {
      const expected = formatLengths[country.code];
      if (expected !== undefined && full.length !== expected) {
        console.error(`LENGTH FAIL ${country.code}: got ${full} (len ${full.length}, expected ${expected})`);
        failures++;
        break;
      }
    }
  }
}

const sample = COUNTRIES.map((c: Country) => `${c.flag} ${c.code} ${c.tier.padEnd(8)} ${generateVat(c)}`).join("\n");
console.log(sample);
console.log("");
if (failures === 0) {
  console.log(`All ${COUNTRIES.length} countries passed (${ITER} iterations each).`);
} else {
  console.error(`${failures} country check(s) FAILED.`);
  process.exit(1);
}
