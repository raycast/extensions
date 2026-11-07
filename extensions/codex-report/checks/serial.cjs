const assert = require("node:assert/strict");
const test = require("node:test");
const { serial } = require("../.test-build/serial.js");

test("serial runs tasks one at a time in call order, even after a failure", async () => {
  const enqueue = serial();
  const events = [];
  const task = (name, ms, fail) => () =>
    new Promise((resolve, reject) => {
      events.push(`start ${name}`);
      setTimeout(() => {
        events.push(`end ${name}`);
        if (fail) reject(new Error(name));
        else resolve(name);
      }, ms);
    });
  const first = enqueue(task("a", 30, true));
  const second = enqueue(task("b", 1));
  await assert.rejects(first, /a/);
  assert.equal(await second, "b");
  assert.deepEqual(events, ["start a", "end a", "start b", "end b"]);
});
