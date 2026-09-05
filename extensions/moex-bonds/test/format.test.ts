import assert from "node:assert/strict";
import { test } from "node:test";

import {
  couponFrequency,
  fmtDate,
  fmtDuration,
  fmtListLevel,
  fmtMoney,
  fmtUntil,
  plural,
  todayMsk,
} from "../src/format";

/** Даём fmtUntil дату, отстоящую от сегодняшнего дня по Москве на N суток. */
function inDays(days: number): string {
  const [y, m, d] = todayMsk().split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

test("plural: дробные числа идут в родительном единственном", () => {
  assert.equal(plural(1, "год", "года", "лет"), "год");
  assert.equal(plural(1.2, "год", "года", "лет"), "года");
  assert.equal(plural(7.4, "год", "года", "лет"), "года");
  assert.equal(plural(5, "год", "года", "лет"), "лет");
  assert.equal(plural(11, "год", "года", "лет"), "лет");
  assert.equal(plural(21, "год", "года", "лет"), "год");
});

test("fmtUntil не теряет год при округлении месяцев до двенадцати", () => {
  assert.equal(fmtUntil(inDays(0)), "сегодня");
  assert.equal(fmtUntil(inDays(2)), "через 2 дня");
  assert.equal(fmtUntil(inDays(-12)), "12 дней назад");
  assert.equal(fmtUntil(inDays(92)), "через 3 месяца");
  // 716 дней — это почти два года; раньше здесь вылезало «через 1 год».
  assert.equal(fmtUntil(inDays(716)), "через 2 года");
  assert.equal(fmtUntil(inDays(533)), "через 1 год 6 мес.");
  assert.equal(fmtUntil(inDays(898)), "через 2 года 6 мес.");
  assert.equal(fmtUntil(null), null);
  assert.equal(fmtUntil("0000-00-00"), null);
});

test("fmtDuration согласует слово с показанным числом", () => {
  assert.equal(fmtDuration(430), "430 дней (1,2 года)");
  // В ru-RU разряды разделяет неразрывный пробел (U+00A0), а не обычный.
  assert.equal(fmtDuration(2569), "2\u00A0569 дней (7 лет)");
  assert.equal(fmtDuration(365), "365 дней (1 год)");
  assert.equal(fmtDuration(null), "—");
  assert.equal(fmtDuration(0), "—");
});

test("couponFrequency переводит период в человеческие слова", () => {
  assert.equal(couponFrequency(182), "2 раза в год (раз в полгода)");
  assert.equal(couponFrequency(91), "4 раза в год (ежеквартально)");
  assert.equal(couponFrequency(30), "12 раз в год (ежемесячно)");
  assert.equal(couponFrequency(365), "раз в год");
  assert.equal(couponFrequency(null), null);
  assert.equal(couponFrequency(0), null);
});

test("деньги печатаются в валюте номинала", () => {
  assert.equal(fmtMoney(35.4, "SUR"), "35,4 ₽");
  assert.equal(fmtMoney(36.44, "USD"), "36,44 $");
  assert.equal(fmtMoney(19.32, "CNY"), "19,32 ¥");
  assert.equal(fmtMoney(null, "SUR"), "—");
});

test("даты и листинг", () => {
  assert.equal(fmtDate("2041-05-15"), "15.05.2041");
  assert.equal(fmtDate("0000-00-00"), "—");
  assert.equal(fmtDate(null), "—");
  assert.equal(fmtListLevel(1), "1-й уровень листинга");
  assert.equal(fmtListLevel(null), "—");
});
