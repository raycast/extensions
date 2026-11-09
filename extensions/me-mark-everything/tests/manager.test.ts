import assert from "node:assert/strict";
import test from "node:test";
import { managerAvailability, managerNotice } from "../src/helpers/manager";

const id = "egbcchcdoehomdjokeohheklekcdomkj";

test("manager handoff depends on the bound browser, not a preference", () => {
  assert.equal(managerAvailability({ browser: "chrome", extensionId: id }), "ready");
  assert.equal(managerAvailability({ browser: "edge", extensionId: id }), "ready");
  assert.equal(managerAvailability({ browser: "arc", extensionId: id }), "unsupported");
  assert.equal(managerAvailability({ browser: "safari", extensionId: id }), "unsupported");
  assert.equal(managerAvailability(undefined), "unbound");
  assert.equal(managerAvailability({}), "unbound");
  // A missing or malformed id cannot open the page either.
  assert.equal(managerAvailability({ browser: "chrome" }), "unbound");
  assert.equal(managerAvailability({ browser: "chrome", extensionId: "z".repeat(32) }), "unbound");
});

test("unsupported browsers are named without claiming success", () => {
  const arc = managerNotice("unsupported", "arc");
  assert.match(arc.title, /Arc/);
  assert.match(arc.message, /Chrome or Edge/);
  assert.match(managerNotice("unbound").message, /Chrome or Edge/);
});
