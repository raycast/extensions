const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  daysInMonth,
  formatRoman,
  leap,
  parseCivil,
  parseRoman,
  toCivil,
  toRoman,
} = require("../.test-build/calendar.js");

function expectDate(date, full, short) {
  const roman = toRoman(date);
  assert.equal(formatRoman(roman, false, false), full);
  assert.equal(formatRoman(roman, true, false), short);
  assert.deepEqual(toCivil(roman), date);
}

test("fixed days and inclusive counting", () => {
  expectDate(
    { year: 2026, month: 3, day: 1 },
    "Kalendae Martiae",
    "Kal. Mart.",
  );
  expectDate(
    { year: 2026, month: 3, day: 3 },
    "ante diem quintum Nonas Martias",
    "a.d. V Non. Mart.",
  );
  expectDate(
    { year: 2026, month: 3, day: 6 },
    "pridie Nonas Martias",
    "prid. Non. Mart.",
  );
  expectDate({ year: 2026, month: 3, day: 7 }, "Nonae Martiae", "Non. Mart.");
  expectDate({ year: 2026, month: 3, day: 15 }, "Idus Martiae", "Id. Mart.");
  expectDate({ year: 2026, month: 4, day: 5 }, "Nonae Apriles", "Non. Apr.");
  expectDate({ year: 2026, month: 4, day: 13 }, "Idus Apriles", "Id. Apr.");
  expectDate(
    { year: 2026, month: 9, day: 22 },
    "ante diem decimum Kalendas Octobres",
    "a.d. X Kal. Oct.",
  );
});

test("February leap day and adjacent dates", () => {
  assert.equal(leap(2024), true);
  assert.equal(leap(1900), false);
  assert.equal(leap(2000), true);
  assert.equal(leap(-1), true); // 1 BCE is astronomical year zero.
  assert.equal(daysInMonth(2, 2024), 29);
  assert.equal(daysInMonth(2, 1900), 28);
  expectDate(
    { year: 2024, month: 2, day: 23 },
    "ante diem septimum Kalendas Martias",
    "a.d. VII Kal. Mart.",
  );
  expectDate(
    { year: 2024, month: 2, day: 24 },
    "ante diem bis sextum Kalendas Martias",
    "a.d. bis VI Kal. Mart.",
  );
  expectDate(
    { year: 2024, month: 2, day: 25 },
    "ante diem sextum Kalendas Martias",
    "a.d. VI Kal. Mart.",
  );
  expectDate(
    { year: 2024, month: 2, day: 29 },
    "pridie Kalendas Martias",
    "prid. Kal. Mart.",
  );
  expectDate(
    { year: 2025, month: 2, day: 24 },
    "ante diem sextum Kalendas Martias",
    "a.d. VI Kal. Mart.",
  );
  assert.throws(
    () => toRoman({ year: 1900, month: 2, day: 29 }),
    /valid Gregorian date/,
  );
  assert.deepEqual(toCivil(parseRoman("a.d. bis VI Kal. Mart. 2024", 2026)), {
    year: 2024,
    month: 2,
    day: 24,
  });
  assert.throws(
    () => toCivil(parseRoman("a.d. bis VI Kal. Mart. 2025", 2026)),
    /bis sextum/,
  );
});

test("1 BCE passes directly to 1 CE, with no year zero", () => {
  const lastBCE = { year: -1, month: 12, day: 31 };
  const roman = toRoman(lastBCE);
  assert.equal(formatRoman(roman), "pridie Kalendas Ianuarias 1 CE");
  assert.deepEqual(toCivil(roman), lastBCE);
  expectDate({ year: 1, month: 1, day: 1 }, "Kalendae Ianuariae", "Kal. Ian.");
  assert.throws(() => toRoman({ year: 0, month: 1, day: 1 }), /no year zero/);
  assert.deepEqual(parseCivil("31 December 1 BCE"), lastBCE);
  assert.deepEqual(parseCivil("31 December -1"), lastBCE);
  assert.deepEqual(
    toCivil(parseRoman("pridie Kalendas Ianuarias 1 CE", 2026)),
    lastBCE,
  );
});

test("late December 9999 references January 10000", () => {
  const last = { year: 9999, month: 12, day: 31 };
  const roman = toRoman(last);
  assert.equal(formatRoman(roman), "pridie Kalendas Ianuarias 10000 CE");
  assert.deepEqual(toCivil(roman), last);
  assert.deepEqual(toCivil(parseRoman("prid. Kal. Ian. 10000 CE", 2026)), last);
  assert.throws(
    () => toRoman({ year: 10000, month: 1, day: 1 }),
    /valid Gregorian date/,
  );
  assert.throws(
    () => toCivil(parseRoman("Kal. Ian. 10000 CE", 2026)),
    /canonical Gregorian date/,
  );
});

test("full and abbreviated parser round trips across boundary years", () => {
  let checked = 0;
  for (const year of [-753, -5, -1, 1, 4, 1900, 2000, 2024, 2026, 9999]) {
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= daysInMonth(month, year); day++) {
        const civil = { year, month, day };
        const roman = toRoman(civil);
        assert.deepEqual(toCivil(roman), civil);
        for (const abbreviated of [false, true]) {
          const text = formatRoman(roman, abbreviated);
          assert.deepEqual(toCivil(parseRoman(text, 2026)), civil, text);
        }
        checked++;
      }
    }
  }
  assert.equal(checked, 3656);
});

test("parser rejects noncanonical or impossible formulas", () => {
  assert.throws(
    () => parseRoman("a.d. IIII Non. Mart. 2026", 2026),
    /noncanonical/,
  );
  assert.throws(
    () => toCivil(parseRoman("a.d. IX Non. Mart. 2026", 2026)),
    /canonical Gregorian date/,
  );
  assert.throws(() => parseCivil("29 February 2025"), /valid Gregorian date/);
  assert.throws(() => parseCivil("1 January 0"), /no year zero/);
  assert.throws(
    () => parseCivil("1 January -1 BCE"),
    /either a negative year or BCE/,
  );
});
