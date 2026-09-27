import assert from "node:assert/strict";
import { test } from "node:test";

import { createFormatter, pluralEn, pluralRu, todayMsk } from "../src/format";

const ru = createFormatter("ru");
const en = createFormatter("en");

/** Дата, отстоящая от сегодняшнего дня по Москве на N суток. */
function inDays(days: number): string {
  const [y, m, d] = todayMsk().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

test("русские числительные: дробные идут в родительном единственном", () => {
  assert.equal(pluralRu(1, "год", "года", "лет"), "год");
  assert.equal(pluralRu(1.2, "год", "года", "лет"), "года");
  assert.equal(pluralRu(5, "год", "года", "лет"), "лет");
  assert.equal(pluralRu(11, "год", "года", "лет"), "лет");
  assert.equal(pluralRu(21, "год", "года", "лет"), "год");
});

test("английские числительные: всё, что не ровно единица, — множественное", () => {
  assert.equal(pluralEn(1, "year", "years"), "year");
  assert.equal(pluralEn(1.2, "year", "years"), "years");
  assert.equal(pluralEn(0, "year", "years"), "years");
});

test("срок не теряет год при округлении месяцев до двенадцати", () => {
  assert.equal(ru.until(inDays(0)), "сегодня");
  assert.equal(ru.until(inDays(2)), "через 2 дня");
  assert.equal(ru.until(inDays(-12)), "12 дней назад");
  assert.equal(ru.until(inDays(92)), "через 3 месяца");
  // 716 дней — это почти два года; здесь когда-то вылезало «через 1 год».
  assert.equal(ru.until(inDays(716)), "через 2 года");
  assert.equal(ru.until(inDays(533)), "через 1 год 6 мес.");
  assert.equal(ru.until(null), null);
  assert.equal(ru.until("0000-00-00"), null);

  assert.equal(en.until(inDays(0)), "today");
  assert.equal(en.until(inDays(2)), "in 2 days");
  assert.equal(en.until(inDays(1)), "in 1 day");
  assert.equal(en.until(inDays(-12)), "12 days ago");
  assert.equal(en.until(inDays(716)), "in 2 years");
  assert.equal(en.until(inDays(533)), "in 1 year 6 mo");
});

test("дюрация согласует слово с показанным числом", () => {
  assert.equal(ru.duration(430), "430 дней (1,2 года)");
  assert.equal(ru.duration(365), "365 дней (1 год)");
  assert.equal(ru.duration(null), "—");
  assert.equal(ru.duration(0), "—");

  assert.equal(en.duration(430), "430 days (1.2 years)");
  assert.equal(en.duration(365), "365 days (1 year)");
  assert.equal(en.duration(null), "—");
});

test("периодичность купона переводится в человеческие слова", () => {
  assert.equal(ru.couponFrequency(182), "2 раза в год (раз в полгода)");
  assert.equal(ru.couponFrequency(30), "12 раз в год (ежемесячно)");
  assert.equal(ru.couponFrequency(null), null);

  assert.equal(en.couponFrequency(182), "twice a year (semi-annual)");
  assert.equal(en.couponFrequency(91), "4 times a year (quarterly)");
  assert.equal(en.couponFrequency(30), "12 times a year (monthly)");
  assert.equal(en.couponFrequency(0), null);
});

test("деньги печатаются в валюте номинала, разделители — по языку", () => {
  assert.equal(ru.money(35.4, "SUR"), "35,4 ₽");
  assert.equal(ru.money(36.44, "USD"), "36,44 $");
  assert.equal(ru.money(null, "SUR"), "—");

  assert.equal(en.money(35.4, "SUR"), "35.4 ₽");
  assert.equal(en.money(36.44, "USD"), "36.44 $");
});

test("проценты: в русском отбиваются пробелом, в английском — нет", () => {
  assert.equal(ru.pct(15.52), "15,52 %");
  assert.equal(en.pct(15.52), "15.52%");
  assert.equal(ru.signedPct(0.67, 1), "+0,7 %");
  assert.equal(en.signedPct(-0.73, 1), "-0.7%");
  assert.equal(en.pct(null), "—");
});

test("даты и листинг", () => {
  assert.equal(ru.date("2041-05-15"), "15.05.2041");
  assert.equal(en.date("2041-05-15"), "May 15, 2041");
  assert.equal(ru.date("0000-00-00"), "—");
  assert.equal(en.date(null), "—");

  assert.equal(ru.listLevel(1), "1-й уровень листинга");
  assert.equal(en.listLevel(1), "Tier 1 listing");
  assert.equal(en.listLevel(null), "—");
});

test("крупные суммы сокращаются по языку", () => {
  assert.equal(ru.bigMoney(6e9, "SUR"), "6 млрд ₽");
  assert.equal(en.bigMoney(6e9, "SUR"), "6 bn ₽");
  assert.equal(en.bigMoney(7e6, "USD"), "7 m $");
});

test("подпись под ценой собирается на языке интерфейса", async () => {
  const { priceLabel, strings } = await import("../src/strings");
  const en = strings("en");
  const rus = strings("ru");
  const fmtEn = createFormatter("en");
  const fmtRu = createFormatter("ru");

  const trade = { value: 99.5, source: "last" as const, stamp: "18:53" };
  assert.equal(priceLabel(trade, fmtEn, en), "trade at 18:53");
  assert.equal(priceLabel(trade, fmtRu, rus), "сделка 18:53");

  const close = { value: 99.5, source: "prev" as const, stamp: "2026-08-28" };
  assert.equal(priceLabel(close, fmtEn, en), "close of Aug 28, 2026");
  assert.equal(priceLabel(close, fmtRu, rus), "закрытие 28.08.2026");

  // Без отметки времени подпись всё равно осмысленная.
  assert.equal(priceLabel({ value: 1, source: "prev", stamp: null }, fmtEn, en), "previous close");
  assert.equal(priceLabel({ value: null, source: "none", stamp: null }, fmtEn, en), null);
});
