import assert from "node:assert/strict";
import { test } from "node:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { request } from "node:http";
import { once } from "node:events";
import { PAC_SERVER_SOURCE } from "../src/pac-server";
import { acquireLifecycleLock } from "../src/lifecycle-lock";
import { atomicPrivateWrite } from "../src/private-state";

async function firstLine(child: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = "";
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`Child readiness timeout: ${stderr}`)), 5_000);
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error(`Child exited: ${stderr}`));
    });
    child.stdout.on("data", (chunk) => {
      text += String(chunk);
      if (text.includes("\n")) {
        clearTimeout(timer);
        resolve(text.split("\n")[0]);
      }
    });
  });
}

async function stopChild(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = once(child, "exit");
  child.kill();
  await exit;
}

function http(port: number, url: string, method = "GET") {
  return new Promise<{ status: number; headers: Record<string, unknown>; body: string }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: url, method, agent: false }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
      res.on("error", reject);
    });
    req.setTimeout(2_000, () => req.destroy(new Error("HTTP timeout")));
    req.on("error", reject);
    req.end();
  });
}

test("real PAC server serves only its PAC file and supports atomic replacement", async (t) => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "router-http-"));
  const pac = path.join(directory, "proxy.pac");
  const body = 'function FindProxyForURL() { return "DIRECT"; }\n';
  await atomicPrivateWrite(pac, body);
  await fs.writeFile(path.join(directory, "automatic-proxy-backup.json"), "PRIVATE_BACKUP");
  await fs.writeFile(path.join(directory, "ssh-tunnel.log"), "PRIVATE_LOG");
  const source = PAC_SERVER_SOURCE.replace(
    "server.serve_forever()",
    "print(server.server_address[1], flush=True)\nserver.serve_forever()",
  );
  const child = spawn("/usr/bin/python3", ["-u", "-c", source, "0", pac, "test-instance"]);
  t.after(async () => {
    await stopChild(child);
    await fs.rm(directory, { recursive: true, force: true });
  });
  const port = Number(await firstLine(child));
  for (const url of ["/proxy.pac", "/proxy.pac?v=123"]) {
    const result = await http(port, url);
    assert.equal(result.status, 200);
    assert.equal(result.body, body);
    assert.equal(result.headers["x-router-instance"], "test-instance");
    assert.equal(result.headers["content-type"], "application/x-ns-proxy-autoconfig");
    const head = await http(port, url, "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    assert.equal(head.headers["content-length"], String(Buffer.byteLength(body)));
  }
  for (const url of [
    "/",
    "/automatic-proxy-backup.json",
    "/ssh-tunnel.log",
    "/diagnostic-config.json",
    "/pac-server.py",
    "/../automatic-proxy-backup.json",
    "/%2e%2e/automatic-proxy-backup.json",
    "/%70roxy.pac",
    "/proxy.pac/extra",
  ]) {
    const result = await http(port, url);
    assert.equal(result.status, 404, url);
    assert.doesNotMatch(result.body, /PRIVATE_BACKUP|PRIVATE_LOG/);
  }
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    assert.equal((await http(port, "/proxy.pac", method)).status, 501);
  const replacement = body.repeat(1000);
  const reads = Promise.all(Array.from({ length: 12 }, () => http(port, "/proxy.pac")));
  await atomicPrivateWrite(pac, replacement);
  for (const result of await reads) assert.ok(result.body === body || result.body === replacement);
  assert.equal((await http(port, "/proxy.pac")).body, replacement);
  assert.equal((await fs.stat(pac)).mode & 0o777, 0o600);
});

test("OS lock excludes independent processes and releases after parent death", async (t) => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "router-lock-"));
  const file = path.join(directory, "operation.lock");
  const modulePath = require.resolve("../src/lifecycle-lock");
  const source = `const {acquireLifecycleLock} = require(process.argv[1]);
    acquireLifecycleLock(process.argv[2]).then(() => { console.log('READY'); setInterval(() => {}, 1000); });`;
  const child = spawn(process.execPath, ["-e", source, modulePath, file]);
  t.after(async () => {
    await stopChild(child);
    await fs.rm(directory, { recursive: true, force: true });
  });
  assert.equal(await firstLine(child), "READY");
  const inode = (await fs.stat(file)).ino;
  await assert.rejects(acquireLifecycleLock(file), /Another router operation is in progress/);
  const exit = once(child, "exit");
  child.kill("SIGKILL");
  await exit;
  // The helper receives EOF when the owner dies, without deleting the lock file.
  let acquired: Awaited<ReturnType<typeof acquireLifecycleLock>> | undefined;
  const deadline = Date.now() + 5_000;
  while (!acquired && Date.now() < deadline) {
    try {
      acquired = await acquireLifecycleLock(file);
    } catch (error) {
      assert.match(String(error), /Another router operation is in progress/);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  assert.ok(acquired);
  acquired.assertHeld();
  await acquired.release();
  assert.throws(() => acquired.assertHeld(), /lock was lost/);
  assert.equal((await fs.stat(file)).ino, inode);
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  const next = await acquireLifecycleLock(file);
  await next.release();
});
