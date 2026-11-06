import assert from "node:assert/strict";
import test from "node:test";
import { createWordClient } from "../src/word-client";
import { toggleTrackChangesScript } from "../src/word-scripts";

test("native failures propagate without retrying a mutation", async () => {
  const failure = new Error("Automation access denied");
  let calls = 0;
  const client = createWordClient(async () => {
    calls++;
    throw failure;
  });
  await assert.rejects(client.toggleTrackChanges(), (error) => error === failure);
  assert.equal(calls, 1);
  await assert.rejects(client.createDocument("Known disposable text"), (error) => error === failure);
  assert.equal(calls, 2);
});

test("no-view toggle passes no identity and has a bounded native timeout", async () => {
  const client = createWordClient(async (script, args, options) => {
    assert.equal(script, toggleTrackChangesScript);
    assert.deepEqual(args, []);
    assert.equal(options.timeout, 30000);
    return "[true]";
  });
  assert.equal(await client.toggleTrackChanges(), true);
});

test("explicit state requires matching boolean readback", async () => {
  const client = createWordClient(async (_script, args) => {
    assert.deepEqual(args, ["Synthetic identity", "off"]);
    return "[true]";
  });
  await assert.rejects(client.setTrackChanges("Synthetic identity", false), /did not apply/);
});

test("invalid responses cannot look like successful creation, text, or tracking", async () => {
  for (const raw of ["null", "{}", "[]", '["x","extra"]', "invalid", "[42]"]) {
    const client = createWordClient(async () => raw);
    await assert.rejects(client.createDocument("Synthetic text"));
    await assert.rejects(client.readText("Synthetic identity"));
    await assert.rejects(client.toggleTrackChanges());
  }
  await assert.rejects(createWordClient(async () => '[""]').createDocument("Synthetic text"), /verify/);
});

test("metadata validates types and does not expose raw malformed data", async () => {
  const client = createWordClient(async () => '["Private malformed response"]');
  await assert.rejects(client.readActiveDocument(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, /Private malformed/);
    return true;
  });
  const metadata = createWordClient(async () => '["Synthetic doc","Synthetic identity","",false,true,false]');
  assert.deepEqual(await metadata.readActiveDocument(), {
    name: "Synthetic doc",
    identity: "Synthetic identity",
    path: "",
    saved: false,
    tracking: true,
    readOnly: false,
  });
});

test("text and creation preserve quotes and Unicode in native arguments", async () => {
  const input = 'Synthetic café with "quotes".\r\nSecond line.\n';
  const client = createWordClient(async (_script, args) => {
    assert.deepEqual(args, ['Synthetic café with "quotes".\rSecond line.\r']);
    return '["Synthetic new doc"]';
  });
  assert.equal(await client.createDocument(input), "Synthetic new doc");
  const text = createWordClient(async () => '["First\\rSecond\\r"]');
  assert.equal(await text.readText("Synthetic identity"), "First\nSecond\n");
});
