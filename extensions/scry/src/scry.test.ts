import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { Download, Progress, literal, run } from "./scry";

const dir = mkdtempSync(join(tmpdir(), "scry-raycast-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let scripts = 0;
function fake(script: string): string {
  const path = join(dir, `scry-${scripts++}`);
  writeFileSync(path, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  return path;
}

const END = `echo '{"type":"end","matched":0,"truncated":false,"found":0,"unsupported":0,"unreadable":0}'`;

test("gives the matches in order, and the progress, once the run ends", async () => {
  const scry = fake(`
echo '{"type":"progress","stage":"score","done":1,"total":2,"walking":false}'
echo '{"type":"match","path":"/a.jpg","score":0.1}'
echo '{"type":"warning","code":"unreadable","message":"bad","path":"/c.png"}'
echo '{"type":"match","path":"/b.jpg","score":0.05}'
${END}`);
  const events: (Download | Progress)[] = [];
  assert.deepEqual(await run(scry, [], (event) => events.push(event)), ["/a.jpg", "/b.jpg"]);
  assert.deepEqual(events, [{ type: "progress", stage: "score", done: 1, total: 2, walking: false }]);
});

test("reads a line that comes in parts, also within a character", async () => {
  const scry = fake(`
printf '{"type":"match","path":"/caf\\303'
sleep 0.2
printf '\\251.jpg"}\\n'
${END}`);
  assert.deepEqual(await run(scry, [], () => {}), ["/café.jpg"]);
});

test("fails with the message of an error line", async () => {
  const scry = fake(`
echo '{"type":"error","code":"other","message":"cannot read the folder"}'
exit 2`);
  await assert.rejects(
    run(scry, [], () => {}),
    { message: "cannot read the folder" },
  );
});

test("asks for a newer scry when it has no --json", async () => {
  const scry = fake(`
echo "error: unexpected argument '--json' found" >&2
exit 2`);
  await assert.rejects(
    run(scry, [], () => {}),
    { message: "Update scry to 0.6.0 or newer" },
  );
});

test("fails with stderr, or the signal, when scry stops without an end line", async () => {
  await assert.rejects(
    run(fake("echo crashed >&2\nexit 101"), [], () => {}),
    { message: "crashed" },
  );
  await assert.rejects(
    run(fake("kill -TERM $$"), [], () => {}),
    { message: "scry exited with SIGTERM" },
  );
});

test("fails when scry cannot start", async () => {
  await assert.rejects(
    run(join(dir, "missing"), [], () => {}),
    { code: "ENOENT" },
  );
});

test("gives scry a file for stdout, because scry stops once nobody reads a pipe", async () => {
  const scry = fake(`
[ -f /dev/stdout ] || { echo "stdout is not a file" >&2; exit 3; }
${END}`);
  assert.deepEqual(await run(scry, [], () => {}), []);
});

test("starts scry in its own process group, so that it outlives Raycast", async () => {
  const scry = fake(`
[ "$(ps -o pgid= -p $$ | tr -d ' ')" = "$$" ] || { echo "scry shares a process group" >&2; exit 3; }
${END}`);
  assert.deepEqual(await run(scry, [], () => {}), []);
});

test("escapes the text so that a regex matches it as it is", () => {
  for (const text of ["C++", "a.b(", "[x]{2}", "^$|\\", "#&-~", "plain text"]) {
    assert.match(text, new RegExp(`^${literal(text)}$`));
  }
});
