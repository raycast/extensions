import assert from "node:assert/strict";
import test from "node:test";
import { getRewriteViewState } from "../src/rewrite-state.ts";

test("rewrite stays loading until both text and modes are ready", () => {
  assert.equal(
    getRewriteViewState({ textLoading: false, modesLoading: true, modes: [] }),
    "loading",
  );
  assert.equal(
    getRewriteViewState({ textLoading: true, modesLoading: false, modes: [] }),
    "loading",
  );
});

test("rewrite shows an empty state after both successful loads have no modes", () => {
  assert.equal(
    getRewriteViewState({ textLoading: false, modesLoading: false, modes: [] }),
    "empty",
  );
});

test("rewrite gives errors precedence once loading completes", () => {
  assert.equal(
    getRewriteViewState({
      textLoading: false,
      modesLoading: false,
      modes: [],
      error: "Не выделен текст",
    }),
    "error",
  );
});
