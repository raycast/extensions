import assert from "node:assert/strict";
import test from "node:test";
import { managerReceipt } from "../src/helper";
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

// ME puts conflicts=1 before the hash; the open/status receipts carry the bare route.
test("manager receipts accept the conflict-list root and reject unrelated routes or libraries", () => {
  const root = { requestId: "r", libraryId: "L", fragment: "/my/0", opened: false };
  assert.equal(managerReceipt(root, "L", false).fragment, "/my/0");
  assert.equal(managerReceipt({ ...root, opened: true }, "L", false).opened, true);
  assert.equal(managerReceipt({ ...root, fragment: "/my/0/item/123" }, "L", true).fragment, "/my/0/item/123");
  for (const fragment of ["/my/0?conflicts=1", "/my/0/item/1", "https://example.org", "/my/1"]) {
    assert.throws(() => managerReceipt({ ...root, fragment }, "L", false), /Invalid manager confirmation/);
  }
  assert.throws(() => managerReceipt(root, "other", false), /Invalid manager confirmation/);
});
