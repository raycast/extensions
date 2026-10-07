import assert from "node:assert/strict";
import { test } from "node:test";
import { captureTopDetail, registerDetail } from "../lib/detail-stack";

function detail() {
  let closed = 0;
  return { close: () => closed++, closed: () => closed };
}

test("a captured detail that is still on top closes", () => {
  const first = detail();
  const unregister = registerDetail(first.close);
  const closeThisDetail = captureTopDetail();
  closeThisDetail();
  assert.equal(first.closed(), 1);
  unregister();
});

test("a captured detail the user already left closes nothing", () => {
  const first = detail();
  const unregister = registerDetail(first.close);
  const closeThisDetail = captureTopDetail();
  unregister();
  closeThisDetail();
  assert.equal(first.closed(), 0);
});

test("a detail opened meanwhile stays open", () => {
  const first = detail();
  const second = detail();
  const unregisterFirst = registerDetail(first.close);
  const closeThisDetail = captureTopDetail();
  unregisterFirst();
  const unregisterSecond = registerDetail(second.close);
  closeThisDetail();
  assert.equal(first.closed(), 0);
  assert.equal(second.closed(), 0);
  unregisterSecond();
});
