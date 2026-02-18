import assert from "node:assert/strict";
import test from "node:test";
import { shouldPlaySound } from "./sound-policy.ts";

const USER_INITIATED = "user-initiated";
const BACKGROUND = "background";

test("shouldPlaySound allows all launches in always mode", () => {
  assert.equal(shouldPlaySound({ soundMode: "always", launchType: USER_INITIATED }), true);
  assert.equal(shouldPlaySound({ soundMode: "always", launchType: BACKGROUND }), true);
});

test("shouldPlaySound allows only background in background-only mode", () => {
  assert.equal(shouldPlaySound({ soundMode: "background-only", launchType: BACKGROUND }), true);
  assert.equal(shouldPlaySound({ soundMode: "background-only", launchType: USER_INITIATED }), false);
});

test("shouldPlaySound disables all launches in off mode", () => {
  assert.equal(shouldPlaySound({ soundMode: "off", launchType: BACKGROUND }), false);
  assert.equal(shouldPlaySound({ soundMode: "off", launchType: USER_INITIATED }), false);
});
