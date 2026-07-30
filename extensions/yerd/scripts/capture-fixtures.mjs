#!/usr/bin/env node
// Captures live Yerd CLI JSON outputs and help texts for type authoring.
// All output is gitignored. Never committed.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const execFileAsync = promisify(execFile);
const YERD_BIN =
  process.env.YERD_BIN ??
  "/Users/kyleanderson/Library/Application Support/io.yerd.Yerd/bin/yerd";

// Check binary exists
if (!existsSync(YERD_BIN)) {
  console.error(`ERROR: binary not found: ${YERD_BIN}`);
  console.error("Set YERD_BIN env var to override.");
  process.exit(1);
}

await mkdir("fixtures/raw/help", { recursive: true });

async function capture(name, args, { expectNonZero = false } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(YERD_BIN, args, {
      timeout: 15000,
    });
    await writeFile(`fixtures/raw/${name}.json`, stdout.trim());
    console.log(`✓ fixtures/raw/${name}.json`);
    return { stdout, stderr, exit: 0 };
  } catch (err) {
    const exit = err.code ?? err.status ?? 1;
    const stdout = err.stdout ?? "";
    const stderr = err.stderr ?? "";
    if (!expectNonZero) {
      console.warn(`⚠ ${name}: exit ${exit} — ${stderr.slice(0, 100)}`);
    }
    await writeFile(
      `fixtures/raw/${name}.json`,
      JSON.stringify({
        _capture_error: true,
        exit,
        stdout: stdout.slice(0, 2000),
        stderr: stderr.slice(0, 2000),
      }),
    );
    return { stdout, stderr, exit };
  }
}

async function captureHelp(name, args) {
  try {
    const { stdout, stderr } = await execFileAsync(
      YERD_BIN,
      [...args, "--help"],
      { timeout: 10000 },
    );
    await writeFile(`fixtures/raw/help/${name}.txt`, (stdout + stderr).trim());
    console.log(`✓ fixtures/raw/help/${name}.txt`);
  } catch (err) {
    const text = (err.stdout ?? "") + (err.stderr ?? "");
    await writeFile(`fixtures/raw/help/${name}.txt`, text.trim());
    console.log(`✓ fixtures/raw/help/${name}.txt (exit ${err.code})`);
  }
}

// JSON captures
await capture("ping", ["--json", "ping"]);
await capture("status", ["--json", "status"]);
await capture("sites", ["--json", "sites"]);
await capture("list-php", ["--json", "list", "php"]);
await capture("list-php-available", ["--json", "list", "php", "--available"]);
await capture("services", ["--json", "services"]);
await capture("service-available", ["--json", "service", "available"]);
await capture("proxy-list", ["--json", "proxy", "list"]);
await capture("mail-list", ["--json", "mail", "list"]);
await capture("tunnel-status", ["--json", "tunnel", "status"]);
await capture("lan-status", ["--json", "lan", "status"]);
await capture("tools", ["--json", "tools"]);
await capture("db-list-mysql", ["--json", "db", "list", "mysql"]);
await capture("doctor", ["--json", "doctor"]); // may exit 0 or 1

// Help texts for every command word used in later todos
const helpTargets = [
  ["sites", ["sites"]],
  ["park", ["park"]],
  ["unpark", ["unpark"]],
  ["link", ["link"]],
  ["unlink", ["unlink"]],
  ["root", ["root"]],
  ["domain", ["domain"]],
  ["proxy", ["proxy"]],
  ["secure", ["secure"]],
  ["unsecure", ["unsecure"]],
  ["use", ["use"]],
  ["install", ["install"]],
  ["uninstall", ["uninstall"]],
  ["update", ["update"]],
  ["restart", ["restart"]],
  ["list", ["list"]],
  ["set", ["set"]],
  ["unset", ["unset"]],
  ["php", ["php"]],
  ["php-ext", ["php", "ext"]],
  ["tools", ["tools"]],
  ["service", ["service"]],
  ["db", ["db"]],
  ["mail", ["mail"]],
  ["tunnel", ["tunnel"]],
  ["lan", ["lan"]],
  ["ping", ["ping"]],
  ["status", ["status"]],
  ["doctor", ["doctor"]],
];
for (const [name, args] of helpTargets) {
  await captureHelp(name, args);
}

console.log("\nCapture complete.");
