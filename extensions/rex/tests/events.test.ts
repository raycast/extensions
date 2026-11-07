import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { eventMatters, subscribeToRexEvents } from "../src/rex/events";

const event = JSON.stringify({ type: "session_event", payload: { event: { type: "window_changed" } } });

async function waitFor(predicate: () => boolean | Promise<boolean>, timeout = 4_000): Promise<void> {
  const start = Date.now();
  while (!(await predicate())) {
    assert.ok(Date.now() - start < timeout, "Timed out waiting for the observable result");
    await delay(20);
  }
}

test("rejects malformed event lines and ignores non-list notifications", () => {
  for (const line of ["invalid", "null", "[]", "42", '{"type":false}']) assert.equal(eventMatters(line), false);
  assert.equal(eventMatters('{"type":"client_joined"}'), false);
  assert.equal(
    eventMatters('{"type":"session_event","payload":{"event":{"type":"block_event","payload":{"name":"bell"}}}}'),
    false,
  );
  assert.equal(eventMatters(event), true);
  assert.equal(eventMatters('{"type":"future_event"}'), true);
});

test("refreshes during continuous events instead of waiting indefinitely for silence", async (t) => {
  let changes = 0;
  const stop = subscribeToRexEvents(
    process.execPath,
    [["-e", `setInterval(()=>console.log(${JSON.stringify(event)}),25)`]],
    () => {
      changes++;
    },
  );
  t.after(stop);
  await waitFor(() => changes >= 2);
});

test("reconnects and refreshes even when the replacement stream is silent", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "rex-events-"));
  const counter = join(dir, "starts");
  let changes = 0;
  const script = `const fs=require('node:fs');const p=${JSON.stringify(counter)};const n=fs.existsSync(p)?Number(fs.readFileSync(p)):0;fs.writeFileSync(p,String(n+1));if(n===0){console.log(${JSON.stringify(event)});setTimeout(()=>process.exit(0),300)}else{setInterval(()=>{},1000)}`;
  const stop = subscribeToRexEvents(process.execPath, [["-e", script]], () => {
    changes++;
  });
  t.after(async () => {
    stop();
    await rm(dir, { recursive: true, force: true });
  });
  await waitFor(async () => Number(await readFile(counter, "utf8").catch(() => "0")) >= 2 && changes >= 2);
  stop();
  const afterStop = changes;
  await delay(300);
  assert.equal(changes, afterStop);
});

test("failed spawns do not refresh or launch a replacement after disposal", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "rex-missing-"));
  const executable = join(dir, "rex");
  const marker = join(dir, "started");
  let changes = 0;
  const stop = subscribeToRexEvents(executable, [["events"]], () => {
    changes++;
  });
  t.after(async () => {
    stop();
    await rm(dir, { recursive: true, force: true });
  });
  await delay(50);
  stop();
  await writeFile(
    executable,
    `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)},'started')\n`,
    { mode: 0o755 },
  );
  await delay(2_100);
  assert.equal(changes, 0);
  assert.equal(await readFile(marker, "utf8").catch(() => undefined), undefined);
});

test("synchronous launch errors are contained", async (t) => {
  let changes = 0;
  const stop = subscribeToRexEvents("invalid\0path", [["events"]], () => {
    changes++;
  });
  t.after(stop);
  await delay(50);
  assert.equal(changes, 0);
});

test("refresh callback rejections are contained", async (t) => {
  let calls = 0;
  const stop = subscribeToRexEvents(
    process.execPath,
    [["-e", `console.log(${JSON.stringify(event)});setInterval(()=>{},1000)`]],
    async () => {
      calls++;
      throw new Error("Snapshot unavailable");
    },
  );
  t.after(stop);
  await waitFor(() => calls > 0);
  await delay(50);
});
