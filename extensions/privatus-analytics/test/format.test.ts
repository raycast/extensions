import assert from "node:assert/strict";
import { test } from "node:test";
import {
  changeIsGood,
  countryFlag,
  countryName,
  formatChange,
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
  isPeriod,
  referrerLabel,
  sparkline,
} from "../src/format";

test("numbers", () => {
  assert.equal(formatNumber(0), "0");
  assert.equal(formatNumber(9876), "9,876");
  assert.equal(formatNumber(12345), "12.3k");
  assert.equal(formatNumber(1143153), "1.1M");
  assert.equal(formatNumber(undefined), "–");
});

test("percent and change", () => {
  assert.equal(formatPercent(51.4), "51.4%");
  assert.equal(formatPercent(50), "50%");
  assert.equal(formatChange(37.8), "+37.8%");
  assert.equal(formatChange(-56.7), "-56.7%");
  assert.equal(formatChange(null), undefined);
});

test("bounce rate going up is bad", () => {
  assert.equal(changeIsGood("bounce_rate", 5), false);
  assert.equal(changeIsGood("bounce_rate", -5), true);
  assert.equal(changeIsGood("visitors", 5), true);
  assert.equal(changeIsGood("visitors", -5), false);
});

test("duration and money", () => {
  assert.equal(formatDuration(3600), "4s");
  assert.equal(formatDuration(103357), "1m 43s");
  assert.equal(formatMoney(123456), "1,234.56");
});

test("countries and referrers", () => {
  assert.equal(countryName("US"), "United States");
  assert.equal(countryFlag("SG"), "🇸🇬");
  assert.equal(countryFlag("??"), "🌐");
  assert.equal(referrerLabel(""), "Direct / None");
  assert.equal(referrerLabel("github.com"), "github.com");
});

test("periods and sparkline", () => {
  assert.equal(isPeriod("7d"), true);
  assert.equal(isPeriod("forever"), false);
  assert.equal(sparkline([0, 5, 10]), "▁▄█");
  assert.equal(sparkline([0, 0]), "▁▁");
  assert.equal(sparkline([]), "");
});
