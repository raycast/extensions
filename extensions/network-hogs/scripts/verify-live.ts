import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { sampleNetwork, monitorNetwork } from "../src/lib/monitor";
import { startNettop } from "../src/lib/nettop";
import { readProcesses } from "../src/lib/processes";
import { UsageSession } from "../src/lib/usage";

async function samplingPids() {
  const processes = await readProcesses();
  return new Set(
    [...processes.values()].filter((info) => /\/(?:nettop|script)$/.test(info.executable)).map((info) => info.pid),
  );
}

async function main() {
  const before = await samplingPids();
  const start = performance.now();
  const snapshot = await sampleNetwork(Promise.resolve([]));
  assert.ok(snapshot.sampledSeconds > 0.8 && snapshot.sampledSeconds < 1.5);
  assert.ok(snapshot.apps.length > 0);
  assert.doesNotThrow(() => structuredClone(snapshot));
  console.log(`One-shot sample: ${Math.round(performance.now() - start)} ms, ${snapshot.apps.length} groups`);

  const streamStart = performance.now();
  await new Promise<void>((resolve, reject) => {
    const stop = monitorNetwork({
      applications: Promise.resolve([]),
      session: new UsageSession(),
      intervalSeconds: 2,
      onError: reject,
      onSnapshot(snapshot) {
        stop();
        assert.ok(snapshot.sampledSeconds > 1.8 && snapshot.sampledSeconds < 2.5);
        resolve();
      },
    });
  });
  const elapsed = Math.round(performance.now() - streamStart);
  // The third header confirms the second sample, after two sampling intervals.
  assert.ok(elapsed < 4500, `First live result took ${elapsed} ms`);
  console.log(`First live result: ${elapsed} ms`);

  // A loopback-only transfer checks measured rates without contacting an external host.
  const server = createServer((_request, response) => {
    response.writeHead(200);
    const timer = setInterval(() => response.write(Buffer.alloc(64 * 1024)), 64);
    response.on("close", () => clearInterval(timer));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const client = spawn(
    process.execPath,
    [
      "-e",
      `
    require('node:http').get('http://127.0.0.1:${address.port}', response => {
      response.once('data', () => process.stdout.write('ready'));
      response.resume();
    }).on('error', () => process.exit(1));
  `,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await once(client.stdout, "data", { signal: AbortSignal.timeout(5000) });
    const transfer = await sampleNetwork(Promise.resolve([]));
    const measured = transfer.apps.flatMap((app) => app.processes).find((info) => info.pid === client.pid);
    assert.ok(measured, "The local download process was missing from nettop");
    assert.ok(
      measured.downloadBps > 800_000 && measured.downloadBps < 1_300_000,
      `Unexpected download rate: ${measured.downloadBps}`,
    );
    console.log(`Controlled 1.024 MB/s local download measured ${(measured.downloadBps / 1_000_000).toFixed(3)} MB/s`);
  } finally {
    client.kill();
    server.closeAllConnections();
    server.close();
    await once(client, "close");
  }

  for (let iteration = 0; iteration < 20; iteration++) {
    await new Promise<void>((resolve, reject) => {
      const stop = startNettop({
        intervalSeconds: 2,
        onError: reject,
        onSample() {
          stop();
          resolve();
        },
      });
    });
    await delay(30);
  }
  await delay(200);
  const after = await samplingPids();
  assert.deepEqual(
    [...after].filter((pid) => !before.has(pid)),
    [],
    "Sampler processes remained after cleanup",
  );
  console.log("20 start/stop cycles: no leftover nettop or script processes");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
