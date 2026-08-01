import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCheckDigit,
  formatMyNumber,
  generateMyNumber,
  isValidMyNumber,
} from "./mynumber.ts";

test("calculateCheckDigit matches hand-calculated examples", () => {
  // Σ Pn×Qn = 212, 212 % 11 = 3 → 11 - 3 = 8（"123456789018" は有効なテスト用番号）
  assert.equal(calculateCheckDigit("12345678901"), 8);
  // Σ Pn×Qn = 206, 206 % 11 = 8 → 11 - 8 = 3
  assert.equal(calculateCheckDigit("02345678901"), 3);
  // 余りが1以下の場合は0になる（全桁0 → Σ = 0）
  assert.equal(calculateCheckDigit("00000000000"), 0);
});

test("calculateCheckDigit rejects invalid input", () => {
  assert.throws(() => calculateCheckDigit("123"));
  assert.throws(() => calculateCheckDigit("1234567890a"));
});

test("generateMyNumber returns 12-digit valid numbers", () => {
  for (let i = 0; i < 1000; i++) {
    const myNumber = generateMyNumber();
    assert.match(myNumber, /^\d{12}$/);
    assert.ok(isValidMyNumber(myNumber), `${myNumber} should be valid`);
  }
});

test("isValidMyNumber rejects tampered numbers", () => {
  const myNumber = generateMyNumber();
  const checkDigit = Number(myNumber[11]);
  const tampered = myNumber.slice(0, 11) + ((checkDigit + 1) % 10);
  assert.equal(isValidMyNumber(tampered), false);
  assert.equal(isValidMyNumber("1234-5678-9012"), false);
  assert.equal(isValidMyNumber(""), false);
});

test("formatMyNumber inserts hyphens only when requested", () => {
  assert.equal(formatMyNumber("123456789012", true), "1234-5678-9012");
  assert.equal(formatMyNumber("123456789012", false), "123456789012");
});
