import assert from "node:assert/strict";
import test from "node:test";

import { formatRecords } from "../src/recordFormatter";

test("splits comma separated input and joins with new lines", () => {
  assert.equal(
    formatRecords({
      input: "api,worker,db",
      splitBy: "comma",
      joinWith: "new-line",
      quoteStyle: "none",
      trimRecords: true,
      removeDuplicates: false,
    }),
    "api\nworker\ndb",
  );
});

test("wraps records with double quotes and joins with commas", () => {
  assert.equal(
    formatRecords({
      input: "api\nworker\ndb",
      splitBy: "new-line",
      joinWith: "comma",
      quoteStyle: "double",
      trimRecords: true,
      removeDuplicates: false,
    }),
    '"api","worker","db"',
  );
});

test("removes duplicate records while preserving first occurrence order", () => {
  assert.equal(
    formatRecords({
      input: "api | worker | api | db",
      splitBy: "vertical-bar",
      joinWith: "semicolon",
      quoteStyle: "single",
      trimRecords: true,
      removeDuplicates: true,
    }),
    "'api';'worker';'db'",
  );
});

test("splits semicolon separated input and joins with vertical bars", () => {
  assert.equal(
    formatRecords({
      input: "api; worker; db",
      splitBy: "semicolon",
      joinWith: "vertical-bar",
      quoteStyle: "none",
      trimRecords: true,
      removeDuplicates: false,
    }),
    "api|worker|db",
  );
});

test("splits whitespace separated input and joins with spaces", () => {
  assert.equal(
    formatRecords({
      input: "api   worker\tdb",
      splitBy: "space",
      joinWith: "space",
      quoteStyle: "none",
      trimRecords: true,
      removeDuplicates: false,
    }),
    "api worker db",
  );
});
