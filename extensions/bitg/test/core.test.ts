// SPDX-FileCopyrightText: 2026 dtwinuz and bitg contributors
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createCore, FLAG_ASCII_TUTUQ } from "../src/core.ts";

const core = await createCore(readFileSync(new URL("../assets/bitg_core.wasm", import.meta.url)));

test("old Latin to the new alphabet", () => {
  assert.equal(core.convert("O'zbekiston go'zal", "new"), "Özbekiston gözal");
});

test("Cyrillic to the new alphabet", () => {
  assert.equal(core.convert("Ассалому алайкум", "new"), "Assalomu alaykum");
});

test("English words stay as they are", () => {
  assert.equal(core.convert("push qilaman", "new"), "push qilaman");
});

test("ASCII tutuq flag", () => {
  assert.equal(core.convert("ma'no", "new", FLAG_ASCII_TUTUQ), "ma'no");
  assert.equal(core.convert("ma'no", "new"), "maʼno");
});

test("back to old Latin and Cyrillic", () => {
  assert.equal(core.convert("Özbekiston", "old-official"), "Oʻzbekiston");
  assert.equal(core.convert("Özbekiston", "old-ascii"), "O'zbekiston");
  assert.equal(core.convert("Özbekiston", "cyrillic"), "Ўзбекистон");
});

test("empty text", () => {
  assert.equal(core.convert("", "new"), "");
});
