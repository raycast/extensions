const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tuple-reactions-test-"));
const binary = path.join(scratch, "tuple");
const log = path.join(scratch, "args.jsonl");
const load = require("./load-typescript.cjs")(binary);
const { listReactions, sendReaction, reactionTitle } = load("src/lib/reactions.ts");
const { TupleErrorKind } = load("src/lib/types.ts");

function fake(body) {
  fs.writeFileSync(log, "");
  fs.writeFileSync(binary, `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nfs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args)+'\\n');\n${body}`, { mode: 0o700 });
}
function calls() {
  return fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}
test.after(() => fs.rmSync(scratch, { recursive: true, force: true }));

test("reaction discovery preserves the empty completion argument and never sends a reaction", async () => {
  fake(`process.stdout.write('airhorn\\nthumbs-up\\nfuture-reaction\\n:4\\n'); process.stderr.write('Completion ended with directive: ShellCompDirectiveNoFileComp\\n');`);
  assert.deepEqual(await listReactions(), ["airhorn", "thumbs-up", "future-reaction"]);
  assert.deepEqual(calls(), [["__completeNoDesc", "call", "react", ""]]);
});

test("reaction discovery handles descriptions, CRLF, duplicates, and completion bitmasks", async () => {
  fake(`process.stdout.write('thumbs-up\\tApprove\\r\\nthumbs-up\\r\\nnew-sound\\tPlay it\\r\\n:36\\r\\n');`);
  assert.deepEqual(await listReactions(), ["thumbs-up", "new-sound"]);
  fake(`process.stdout.write(':4\\n');`);
  assert.deepEqual(await listReactions(), []);
});

test("CLI additions and removals are loaded without a maintained catalog or cached choices", async () => {
  fake(`process.stdout.write('thumbs-up\\n:4\\n');`);
  assert.deepEqual(await listReactions(), ["thumbs-up"]);
  fake(`process.stdout.write('plus-one\\nfuture-animation\\n:4\\n');`);
  assert.deepEqual(await listReactions(), ["plus-one", "future-animation"]);
  assert.equal(reactionTitle("future-animation"), "Future Animation");
});

test("malformed or failed completion has no guessed reaction fallback", async () => {
  for (const output of ["thumbs-up\\n", "thumbs-up\\n:5\\n", "thumbs-up\\n:error\\n", ""]) {
    fake(`process.stdout.write(${JSON.stringify(output.replaceAll("\\n", "\n"))});`);
    await assert.rejects(listReactions(), /could not list its reactions/);
    assert.equal(calls().length, 1);
  }
  fake(`process.stdout.write('thumbs-up\\n:4\\n'); process.stderr.write('{"error":"Discovery failed"}'); process.exitCode=1;`);
  await assert.rejects(listReactions(), /Discovery failed/);
});

test("sending rechecks installed choices and preserves the exact argument without a shell", async () => {
  const reaction = "new-$(not-a-shell)";
  fake(`if (args[0] === '__completeNoDesc') process.stdout.write(${JSON.stringify(`${reaction}\n:4\n`)});`);
  await sendReaction(reaction);
  assert.deepEqual(calls(), [
    ["__completeNoDesc", "call", "react", ""],
    ["--format", "json", "call", "react", reaction],
  ]);
});

test("a removed reaction or failed rediscovery cannot send a stale selection", async () => {
  fake(`process.stdout.write('replacement\\n:4\\n');`);
  await assert.rejects(sendReaction("removed"), /no longer available/);
  assert.deepEqual(calls(), [["__completeNoDesc", "call", "react", ""]]);
  fake(`process.stdout.write('removed\\n:1\\n');`);
  await assert.rejects(sendReaction("removed"), /could not list its reactions/);
  assert.equal(calls().length, 1);
});

test("reaction sends preserve canonical no-active-call and server error handling", async () => {
  for (const [kind, expected] of [["no_active_call", TupleErrorKind.NoActiveCall], ["daemon_down", TupleErrorKind.DaemonDown], ["invalid_reaction", TupleErrorKind.Unknown]]) {
    fake(`if (args[0] === '__completeNoDesc') process.stdout.write('thumbs-up\\n:4\\n'); else { process.stderr.write(JSON.stringify({kind:${JSON.stringify(kind)},error:'Cannot send reaction'})); process.exitCode=1; }`);
    await assert.rejects(sendReaction("thumbs-up"), (error) => error.kind === expected && error.message === "Cannot send reaction");
  }
});
