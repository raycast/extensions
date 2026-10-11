import assert from "node:assert/strict";
import { test } from "node:test";
import { marketForLocale, formatUsedPrice } from "../src/pricing";

test("automatic market uses explicit region rather than language", () => {
  for (const locale of ["en_GB", "fr-GB", "en_GB@calendar=gregorian"])
    assert.equal(marketForLocale(locale), "UK");
  for (const locale of ["de_DE", "en_IE", "fr_FR", "pl_PL"])
    assert.equal(marketForLocale(locale), "EU");
  for (const locale of [
    "en_US",
    "en_CA",
    "en_AU",
    "de_CH",
    "de",
    "invalid_locale",
    "",
  ])
    assert.equal(marketForLocale(locale), "US");
});
test("prices select matching market and currency without converting or falling back", () => {
  const prices = { US: 10000, UK: 8000, EU: 9000 };
  assert.equal(formatUsedPrice(prices, "US"), "~$100.00");
  assert.equal(formatUsedPrice(prices, "UK"), "~£80.00");
  assert.equal(formatUsedPrice(prices, "EU"), "~€90.00");
  assert.equal(formatUsedPrice({ US: 10000 }, "UK", 10000), undefined);
  assert.equal(formatUsedPrice(undefined, "US", 10000), "~$100.00");
  assert.equal(formatUsedPrice({ UK: 0 }, "UK"), undefined);
});
