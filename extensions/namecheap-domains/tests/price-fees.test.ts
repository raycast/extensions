import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { feeNote, hasExtraFees, priceForDomain, priceLabel, totalFirstTerm } from "../src/domain/price";
import type { DomainCheckResult, PricingTable } from "../src/namecheap/types";

const pricing: PricingTable = {
  com: { tld: "com", currency: "USD", byYears: { 1: 10.98, 2: 12.5 }, regularByYears: { 1: 14.98 } },
  sbs: { tld: "sbs", currency: "USD", byYears: { 1: 3.98 }, regularByYears: {} },
};

const check = (over: Partial<DomainCheckResult> = {}): DomainCheckResult => ({
  domain: "acme.com",
  available: true,
  errorNo: 0,
  description: "",
  isPremium: false,
  premiumRegistrationPrice: 0,
  premiumRenewalPrice: 0,
  icannFee: 0,
  eapFee: 0,
  ...over,
});

describe("term pricing", () => {
  // Namecheap's price row for a term is the total for that term. The upstream fixture has .com at 8.88 for
  // one year and 17.76 for two, so labelling the two-year figure per-year would imply double the real cost.
  it("labels a single year as a yearly rate", () => {
    const price = priceForDomain("acme.com", pricing, 1, check());
    assert.ok(price);
    assert.equal(priceLabel(price, 1), "$10.98/yr");
  });

  it("labels a multi-year term as a total, never per year", () => {
    const price = priceForDomain("acme.com", pricing, 2, check());
    assert.ok(price);
    const label = priceLabel(price, 2);
    assert.equal(label, "$12.50 total for 2 years");
    assert.doesNotMatch(label, /\/yr/);
  });

  it("uses the term row rather than multiplying the one-year price", () => {
    const oneYear = priceForDomain("acme.com", pricing, 1, check());
    const twoYear = priceForDomain("acme.com", pricing, 2, check());
    assert.ok(oneYear && twoYear);
    assert.equal(twoYear.amount, 12.5);
    assert.notEqual(twoYear.amount, oneYear.amount * 2);
  });
});

describe("fees that Namecheap charges on top of the registration price", () => {
  it("reports no extra fees when there are none", () => {
    const price = priceForDomain("acme.com", pricing, 1, check());
    assert.ok(price);
    assert.equal(hasExtraFees(price), false);
    assert.equal(feeNote(price), "");
    assert.equal(totalFirstTerm(price), 10.98);
  });

  it("keeps the ICANN fee visible instead of folding it away", () => {
    const price = priceForDomain("acme.com", pricing, 1, check({ icannFee: 0.18 }));
    assert.ok(price);
    assert.equal(hasExtraFees(price), true);
    assert.match(feeNote(price), /ICANN/);
    assert.equal(Number(totalFirstTerm(price).toFixed(2)), 11.16);
  });

  it("surfaces an early-access fee, which can dwarf the registration price", () => {
    const price = priceForDomain("acme.sbs", pricing, 1, check({ domain: "acme.sbs", eapFee: 12000 }));
    assert.ok(price);
    assert.equal(price.eapFee, 12000);
    assert.equal(hasExtraFees(price), true);
    assert.match(feeNote(price), /early access/i);
    assert.equal(totalFirstTerm(price), 12003.98);
  });

  it("names both fees when both apply", () => {
    const price = priceForDomain("acme.com", pricing, 1, check({ icannFee: 0.18, eapFee: 500 }));
    assert.ok(price);
    assert.match(feeNote(price), /ICANN.*and.*early access/i);
  });

  it("carries fees through a premium quote", () => {
    const price = priceForDomain("acme.com", pricing, 1, check({ isPremium: true, premiumRegistrationPrice: 1038.7, icannFee: 0.18 }));
    assert.ok(price);
    assert.equal(price.premium, true);
    assert.equal(price.amount, 1038.7);
    assert.equal(price.icannFee, 0.18);
    assert.match(priceLabel(price, 1), /premium/i);
  });
});
