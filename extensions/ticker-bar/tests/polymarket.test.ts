import assert from "node:assert/strict";
import test from "node:test";
import {
  polymarketOutcomeBook,
  polymarketOutcomeChange,
  polymarketOutcomePrice,
} from "../src/polymarket.ts";

test("maps Yes and No to their indexed probabilities", () => {
  assert.equal(polymarketOutcomePrice([0.72, 0.28], 0, 2, 0.72), 0.72);
  assert.equal(polymarketOutcomePrice([0.72, 0.28], 1, 2, 0.72), 0.28);
});

test("uses complementary binary values only as a fallback", () => {
  assert.equal(polymarketOutcomePrice([], 0, 2, 0.72), 0.72);
  assert.equal(polymarketOutcomePrice([], 1, 2, 0.72), 0.28);
  assert.equal(polymarketOutcomePrice([], 1, 3, 0.72), undefined);
});

test("inverts change and order book values for the No outcome", () => {
  assert.equal(polymarketOutcomeChange(0.03, 0, 2), 3);
  assert.equal(polymarketOutcomeChange(0.03, 1, 2), -3);
  assert.deepEqual(polymarketOutcomeBook(0.7, 0.74, 1, 2), {
    bid: 0.26,
    ask: 0.3,
  });
});
