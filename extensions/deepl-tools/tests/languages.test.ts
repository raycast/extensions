import assert from "node:assert/strict";
import test from "node:test";
import { chooseDirection } from "../src/languages";

test("routes confidently detected primary-language text to the secondary language", () => {
  const result = chooseDirection("Привет, как твои дела сегодня? Надеюсь, у тебя всё хорошо.", "RU", "EN-US");

  assert.equal(result.targetLang, "EN-US");
  assert.equal(result.isUncertain, false);
});

test("routes confidently detected secondary-language text to the primary language", () => {
  const result = chooseDirection("Hello, how are you doing today? I hope everything is going well for you.", "RU", "EN-US");

  assert.equal(result.targetLang, "RU");
  assert.equal(result.isUncertain, false);
});

test("defers short-text routing to DeepL", () => {
  const result = chooseDirection("Hello", "EN-US", "FR");

  assert.equal(result.targetLang, "EN-US");
  assert.equal(result.isUncertain, true);
});

test("rejects two variants of the same language", () => {
  assert.throws(() => chooseDirection("Hello", "EN-US", "EN-GB"), /must be different languages/);
});
