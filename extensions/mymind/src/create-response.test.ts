import assert from "node:assert/strict";
import test from "node:test";
import { extractCreatedObjectId } from "./create-response";

test("extractCreatedObjectId reads a top-level id", () => {
  assert.equal(extractCreatedObjectId({ id: "abc123" }), "abc123");
});

test("extractCreatedObjectId reads nested wrapper ids", () => {
  assert.equal(extractCreatedObjectId({ object: { id: "abc123" } }), "abc123");
  assert.equal(extractCreatedObjectId({ data: { result: { id: "xyz789" } } }), "xyz789");
});

test("extractCreatedObjectId ignores invalid shapes", () => {
  assert.equal(extractCreatedObjectId(null), undefined);
  assert.equal(extractCreatedObjectId({ id: 42 }), undefined);
  assert.equal(extractCreatedObjectId({ object: { id: "" } }), undefined);
});
