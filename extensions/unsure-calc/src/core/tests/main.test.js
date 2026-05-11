import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpression, shuntingYard, tokenize } from "../calc-core";

test("Tokenizer keeps minus separate from number", () => {
  const tokens = tokenize("1-2");
  assert.deepStrictEqual(tokens, [1, "-", 2]);
});

test("Shunting yard parses leading negative number", () => {
  const rpn = shuntingYard(tokenize("-2+5"));
  assert.deepStrictEqual(rpn, [2, "NEG", 5, "+"]);
});

test("Shunting yard parses negative factor", () => {
  const rpn = shuntingYard(tokenize("1*-2"));
  assert.deepStrictEqual(rpn, [1, 2, "NEG", "*"]);
});

test("Evaluation handles nested expression with range", () => {
  const result = evaluateExpression("((1-2)~3)");
  assert.strictEqual(result.min, -1);
  assert.strictEqual(result.max, 3);
  assert.strictEqual(result.mean, 1);
});

test("Evaluation computes simple addition with leading negative", () => {
  const result = evaluateExpression("-2+5");
  assert.strictEqual(result.mean, 3);
});

test("Evaluation resolves precedence with power", () => {
  const result = evaluateExpression("-2^2");
  // Our parser binds unary minus tighter than exponent, so (-2)^2
  assert.strictEqual(result.mean, 4);
});
