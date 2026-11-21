import assert from "node:assert/strict";
import { test } from "node:test";
import { matchingRow, priceLine, priceRows, quote, startingPrice, startingPriceText } from "../src/lib/price";

const perRun = {
  dynamicprice: [
    { inputs: { quality: "low", resolution: "1k" }, price: 0.006, priceMethod: "cpr" },
    { inputs: { quality: "high", resolution: "1k" }, price: 0.211, priceMethod: "cpr" },
  ],
};

test("the row for the chosen settings sets the price", () => {
  assert.equal(quote(perRun, { quality: "high", resolution: "1k" }).label, "$0.211");
  assert.equal(quote(perRun, { quality: "low", resolution: "1k" }).amount, 0.006);
  assert.equal(quote(perRun, { quality: "medium", resolution: "4k" }).label, "by run time");
});

test("price lists sent as JSON strings are read too", () => {
  assert.equal(priceRows({ dynamicprice: '[{"inputs":{},"price":0.035,"priceMethod":"cpo"}]' }).length, 1);
});

test("per-output, per-character, per-audio-second and per-video-second prices", () => {
  const perOutput = { dynamicprice: [{ inputs: {}, price: 0.035, priceMethod: "cpo" }] };
  assert.equal(quote(perOutput, {}).label, "$0.035");
  assert.equal(quote(perOutput, { samples: 3 }).label, "$0.105 for 3 outputs");

  const perCharacter = { dynamicprice: [{ inputs: {}, price: 0.00004, priceMethod: "cp-promptlength" }] };
  assert.equal(quote(perCharacter, {}).label, "$0.00004 / character");
  assert.equal(quote(perCharacter, {}, { promptChars: 500 }).label, "$0.02 for 500 characters");

  const perAudioSecond = { dynamicprice: [{ inputs: {}, price: 0.0003, priceMethod: "cp-audiosecondslength" }] };
  assert.equal(quote(perAudioSecond, {}).label, "$0.0003 / audio second");

  const perVideoSecond = { dynamicprice: [{ inputs: {}, price: 0.1, priceMethod: "cp-outputVideoLength" }] };
  assert.equal(quote(perVideoSecond, { duration: "5" }).label, "$0.50");
});

test("rows that count files bill the valid row with the highest count", () => {
  const rows = priceRows({
    dynamicprice: [
      { inputs: { inputImage: "QUANTITY:0" }, price: 0.03, priceMethod: "cpr" },
      { inputs: { inputImage: "QUANTITY:1" }, price: 0.05, priceMethod: "cpr" },
      { inputs: { inputImage: "QUANTITY:3" }, price: 0.09, priceMethod: "cpr" },
    ],
  });
  assert.equal(matchingRow(rows, {})?.price, 0.03);
  assert.equal(matchingRow(rows, { inputImage: ["a"] })?.price, 0.05);
  assert.equal(matchingRow(rows, { inputImage: ["a", "b"] })?.price, 0.05);
  assert.equal(matchingRow(rows, { inputImage: ["a", "b", "c"] })?.price, 0.09);
});

test("models without a price list are billed by run time", () => {
  assert.equal(quote({ approximatelycost: "0.0132" }, {}).label, "about $0.013");
  assert.equal(quote({ cps: "0.0005" }, {}).label, "$0.0005 / second");
  assert.equal(quote({}, {}).label, "by run time");
  assert.equal(quote({ dynamicprice: [{ inputs: {}, price: 0, priceMethod: "cpr" }] }, {}).label, "Free");
});

test("the caller's discount lowers the price and shows on the line", () => {
  const discounted = quote({ ...perRun, discount: 20 }, { quality: "high", resolution: "1k" });
  assert.equal(discounted.amount?.toFixed(4), "0.1688");
  assert.equal(priceLine(discounted), "$0.169 (20% off)");
  assert.equal(priceLine(quote(perRun, { quality: "low", resolution: "1k" })), "$0.006");
});

test("starting prices for the search list", () => {
  assert.deepEqual(startingPrice(perRun), { amount: 0.006, method: "cpr" });
  assert.equal(startingPriceText(perRun), "From $0.006 per run");
  assert.equal(
    startingPriceText({ dynamicprice: [{ inputs: {}, price: 0.035, priceMethod: "cpo" }] }),
    "From $0.035 per output",
  );
  assert.equal(startingPriceText({ approximatelycost: 0.0218 }), "About $0.022 per run");
  assert.equal(startingPriceText({}), undefined);
});

test("an output count setting multiplies a per-output price", () => {
  const perOutput = { dynamicprice: [{ inputs: {}, price: 0.035, priceMethod: "cpo" }] };
  assert.equal(quote(perOutput, { maxImages: 2 }).label, "$0.07 for 2 outputs");
});
