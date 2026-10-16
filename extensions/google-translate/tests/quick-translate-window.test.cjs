const assert = require("node:assert/strict");
const test = require("node:test");
const { createWindowTracker } = require("../assets/watch-quick-translate-window.js");

function window(id, overrides = {}) {
  return {
    kCGWindowNumber: id,
    kCGWindowOwnerPID: 123,
    kCGWindowAlpha: 1,
    kCGWindowBounds: { Width: 750, Height: 500 },
    ...overrides,
  };
}

test("closing the launcher is detected even while another Raycast window stays open", () => {
  const update = createWindowTracker(123, 5000);
  assert.equal(update([window(1), window(2)], 0), "waiting");
  assert.equal(update([window(1), window(2)], 100), "waiting");
  assert.equal(update([window(2)], 200), "closed");
});

test("other applications, transparent windows and small overlays are ignored during startup", () => {
  const update = createWindowTracker(123, 5000);
  const unrelated = [
    window(2, { kCGWindowOwnerPID: 456 }),
    window(3, { kCGWindowAlpha: 0 }),
    window(4, { kCGWindowBounds: { Width: 60, Height: 60 } }),
  ];
  assert.equal(update(unrelated, 0), "waiting");
  assert.equal(update([window(1), ...unrelated], 100), "waiting");
  assert.equal(update(unrelated, 200), "closed");
});

test("a launcher that becomes transparent is treated as dismissed", () => {
  const update = createWindowTracker(123, 5000);
  assert.equal(update([window(1)], 0), "waiting");
  assert.equal(update([window(1, { kCGWindowAlpha: 0 })], 100), "closed");
});

test("startup waits for a launcher but times out without resetting an unrelated command", () => {
  const update = createWindowTracker(123, 5000);
  assert.equal(update([], 0), "waiting");
  assert.equal(update([], 4999), "waiting");
  assert.equal(update([], 5000), "unavailable");
});

test("a later command launch tracks a fresh window independently", () => {
  const first = createWindowTracker(123, 5000);
  first([window(1)], 0);
  assert.equal(first([], 100), "closed");
  const second = createWindowTracker(123, 6000);
  assert.equal(second([window(9)], 1000), "waiting");
  assert.equal(second([window(9)], 1100), "waiting");
  assert.equal(second([], 1200), "closed");
});
