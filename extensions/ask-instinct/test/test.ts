import assert from "node:assert/strict";
import { pickQuery, normalizeAddress, sendToAgent, SEND_SCRIPT } from "../src/lib";
import { parseIncomingMessages, sqlString } from "../src/messages";
assert.equal(pickQuery("", "from fallback"), "from fallback");
assert.equal(pickQuery(undefined, "fb"), "fb");
assert.equal(pickQuery("   ", "fb"), "fb");
assert.equal(pickQuery(" typed ", "fb"), "typed");
assert.equal(pickQuery("", ""), "");
assert.equal(pickQuery(null, null), "");
assert.equal(normalizeAddress("+16502507203"), "+16502507203");
assert.equal(normalizeAddress("(650) 250-7203"), "+16502507203");
assert.equal(normalizeAddress("1 650 250 7203"), "+16502507203");
assert.equal(normalizeAddress("Foo@Bar.com"), "foo@bar.com");
for (const bad of ["", "650250", "+1650250720a", "abc", "+16502507203; rm", "1234567890123456789"]) assert.equal(normalizeAddress(bad), null, bad);
assert.equal(sqlString("+16502507203"), "'+16502507203'");
assert.equal(sqlString("a'b@example.com"), "'a''b@example.com'");
assert.deepEqual(parseIncomingMessages(""), []);
assert.deepEqual(parseIncomingMessages('[{"rowid":42,"text":" hello "}]'), [{ rowId: 42, text: "hello" }]);
assert.match(parseIncomingMessages('[{"rowid":43,"text":null}]')[0].text, /reply arrived/i);
const nasty = [`He said "hi" and 'bye'`, "line1\nline2\r\nline3", "cost $5 $(whoami) `id` \\n \\", "日本語 émoji 🚀 ünï", "-e --flag", "tab\there", "a".repeat(5000)];
(async () => {
  for (const q of nasty) {
    let seen: { script: string; args: string[] } | undefined;
    await sendToAgent(async (script, args) => { seen = { script, args }; return ""; }, "+16502507203", q);
    assert.equal(seen!.args[0], "+16502507203");
    assert.equal(seen!.args[1], q);              // byte-exact, untrimmed, in argv
    assert.equal(seen!.args.length, 2);
    assert.equal(seen!.script, SEND_SCRIPT);     // script never contains the query
  }
  let called = false;
  await assert.rejects(sendToAgent(async () => { called = true; return ""; }, "nonsense", "hi"));
  await assert.rejects(sendToAgent(async () => { called = true; return ""; }, "+16502507203", "  "));
  assert.equal(called, false);
  await assert.rejects(sendToAgent(async () => { throw new Error("boom"); }, "+16502507203", "hi"), /boom/);
  console.log("ALL TESTS PASSED", nasty.length, "payloads");
})();
