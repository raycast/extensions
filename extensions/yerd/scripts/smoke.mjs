#!/usr/bin/env node
/**
 * Yerd Raycast Extension — Live Smoke Suite
 *
 * Phase A: Read-only CLI probes, each checked against the runtime validators
 * Phase B: Bridge liveness (runYerd via tsx)
 * Phase C: Fixture lifecycle (site, proxy, database) with a write-ahead
 *          ownership ledger for crash-safe cleanup
 *
 * Ownership ledger: /tmp/raycast-yerd-qa-ledger.json
 * - Written BEFORE each fixture create
 * - Removed AFTER confirmed cleanup
 * - On startup: clean ledger-recorded leftovers from interrupted runs
 * - Present AND absent from ledger = genuine user resource → SKIP, never touch
 *
 * Crash injection (for QA of the ledger itself):
 *   SMOKE_CRASH=site-linked npm run smoke
 * SIGKILLs the process right after the site fixture is linked, leaving the
 * ledger behind; the next run must recover and pass.
 */

import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

// ─── Configuration ────────────────────────────────────────────────────────────
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const YERD_BIN =
  process.env.YERD_BIN ??
  `${process.env.HOME}/Library/Application Support/io.yerd.Yerd/bin/yerd`;
const LEDGER_PATH = "/tmp/raycast-yerd-qa-ledger.json";
const FIXTURE_SITE = "raycast-qa-fixture";
const FIXTURE_PROXY = "raycast-qa-proxy";
const FIXTURE_DB = "raycast_qa_tmp";
const FIXTURE_SITE_DIR = join(tmpdir(), FIXTURE_SITE);
const PAYLOAD_PATH = join(tmpdir(), `raycast-yerd-smoke-payload-${process.pid}.json`);
const VALIDATORS_TS = join(ROOT, "src", "yerd", "validators.ts");
const CLI_TS = join(ROOT, "src", "yerd", "cli.ts");

// ─── Binary check ─────────────────────────────────────────────────────────────
if (!existsSync(YERD_BIN)) {
  console.error(`ERROR: binary not found: ${YERD_BIN}`);
  console.error("Set YERD_BIN env var to override.");
  process.exit(1);
}

// ─── Ledger helpers ───────────────────────────────────────────────────────────
function readLedger() {
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return {};
  }
}
function writeLedger(data) {
  if (Object.keys(data).length === 0) {
    try {
      rmSync(LEDGER_PATH, { force: true });
    } catch {
      /* already gone */
    }
  } else {
    writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2));
  }
}
function ledgerAdd(key) {
  const l = readLedger();
  l[key] = true;
  writeLedger(l);
}
function ledgerRemove(key) {
  const l = readLedger();
  delete l[key];
  writeLedger(l);
}
function ledgerHas(key) {
  return !!readLedger()[key];
}

// ─── CLI helper ───────────────────────────────────────────────────────────────
/** Run `yerd --json <args>`. Never throws; always returns {ok, data, exit}. */
async function yerd(args, { timeoutMs = 15000 } = {}) {
  try {
    const { stdout } = await execFileAsync(YERD_BIN, ["--json", ...args], {
      timeout: timeoutMs,
    });
    return { ok: true, data: JSON.parse(stdout), exit: 0 };
  } catch (err) {
    const exit = typeof err.code === "number" ? err.code : 1;
    const stdout = err.stdout ?? "";
    let data = null;
    try {
      data = JSON.parse(stdout);
    } catch {
      /* no JSON body */
    }
    return { ok: false, data, exit, stderr: err.stderr ?? "" };
  }
}

/** Run a TS snippet under tsx (used to exercise the real bridge + validators). */
function runTs(code, { timeoutMs = 20000 } = {}) {
  return execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", code],
    { timeout: timeoutMs, cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
  );
}

// ─── PASS/FAIL table ──────────────────────────────────────────────────────────
const results = [];
function pass(name) {
  results.push({ name, status: "PASS" });
  console.log(`  ✓ ${name}`);
}
function fail(name, reason) {
  results.push({ name, status: "FAIL", reason });
  console.log(`  ✗ ${name} — ${reason}`);
}
function skip(name, reason) {
  results.push({ name, status: "SKIP", reason });
  console.log(`  ○ ${name} — ${reason}`);
}

function printTable() {
  console.log("\n" + "─".repeat(64));
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "SKIP" ? "○" : "✗";
    const line = `${icon} ${r.name.padEnd(46)} ${r.status}`;
    console.log(r.reason ? `${line} — ${r.reason}` : line);
  }
  console.log("─".repeat(64));
  const counts = {
    PASS: results.filter((r) => r.status === "PASS").length,
    SKIP: results.filter((r) => r.status === "SKIP").length,
    FAIL: results.filter((r) => r.status === "FAIL").length,
  };
  console.log(`\n${counts.PASS} PASS  ${counts.SKIP} SKIP  ${counts.FAIL} FAIL\n`);
  if (counts.FAIL > 0) process.exit(1);
}

// ─── Startup recovery ─────────────────────────────────────────────────────────
async function startupRecovery() {
  const ledger = readLedger();
  const keys = Object.keys(ledger);
  if (keys.length === 0) return;
  console.log(`[recovery] Ledger found with ${keys.length} entries — cleaning smoke-owned residue...`);

  if (ledger["site:" + FIXTURE_SITE]) {
    const r = await yerd(["sites"]);
    if (r.ok && r.data?.sites?.some((s) => s.name === FIXTURE_SITE)) {
      await yerd(["unlink", FIXTURE_SITE], { timeoutMs: 30000 });
      console.log(`[recovery] Unlinked ${FIXTURE_SITE}`);
    }
    rmSync(FIXTURE_SITE_DIR, { recursive: true, force: true });
    ledgerRemove("site:" + FIXTURE_SITE);
  }
  if (ledger["proxy:" + FIXTURE_PROXY]) {
    await yerd(["proxy", "remove", FIXTURE_PROXY], { timeoutMs: 30000 });
    console.log(`[recovery] Removed proxy ${FIXTURE_PROXY} (if present)`);
    ledgerRemove("proxy:" + FIXTURE_PROXY);
  }
  if (ledger["db:" + FIXTURE_DB]) {
    await yerd(["db", "drop", "mysql", FIXTURE_DB], { timeoutMs: 30000 });
    console.log(`[recovery] Dropped db ${FIXTURE_DB} (if present)`);
    ledgerRemove("db:" + FIXTURE_DB);
  }
  console.log("[recovery] Done.");
}

// ─── Forbidden-ops static self-check ──────────────────────────────────────────
// Specs are stored second-word-first so this file never contains a line that
// matches its own patterns.
const FORBIDDEN_SPECS = ["daemon|restart", "fix|doctor", "stop|service", "clear|mail"];
function forbiddenOpsCheck() {
  const patterns = FORBIDDEN_SPECS.map((s) => {
    const [b, a] = s.split("|");
    return new RegExp(a + ".*" + b, "i");
  });
  const lines = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
  for (const re of patterns) {
    const hit = lines.find((l) => re.test(l));
    if (hit) {
      fail("forbidden-ops check", `${re} matched: ${hit.trim().slice(0, 60)}`);
      return;
    }
  }
  pass("forbidden-ops check");
}

// ─── Phase A: Read-only probes + validators ───────────────────────────────────
const VALIDATOR_NAMES = new Set([
  "assertStatusShape",
  "assertSitesShape",
  "assertPhpShape",
  "assertPhpAvailableShape",
  "assertServicesShape",
  "assertServiceAvailableShape",
  "assertProxiesShape",
  "assertMailListShape",
  "assertToolsShape",
  "assertTunnelStatusShape",
  "assertLanStatusShape",
  "assertDoctorShape",
]);

function runValidator(validatorName, data) {
  writeFileSync(PAYLOAD_PATH, JSON.stringify(data));
  runTs(
    `import { ${validatorName} } from ${JSON.stringify(VALIDATORS_TS)};\n` +
      `import { readFileSync } from "node:fs";\n` +
      `${validatorName}(JSON.parse(readFileSync(${JSON.stringify(PAYLOAD_PATH)}, "utf8")));\n`,
    { timeoutMs: 15000 },
  );
}

async function phaseA() {
  console.log("\n── Phase A: Read-only probes ──");

  async function probe(name, args, validatorName, { acceptExit = [0], timeoutMs = 15000 } = {}) {
    const r = await yerd(args, { timeoutMs });
    if (!acceptExit.includes(r.exit)) {
      fail(name, `exit ${r.exit} not in ${JSON.stringify(acceptExit)}`);
      return;
    }
    if (!r.data) {
      fail(name, "no JSON body");
      return;
    }
    if (!validatorName) {
      // ping: parse-only, no validator by design
      pass(name);
      return;
    }
    if (!VALIDATOR_NAMES.has(validatorName)) {
      fail(name, `unknown validator ${validatorName}`);
      return;
    }
    try {
      runValidator(validatorName, r.data);
      pass(name);
    } catch (e) {
      const detail = (e.stderr?.toString() || e.message || "").slice(0, 100);
      fail(name, `validator failed: ${detail}`);
    }
  }

  await probe("ping", ["ping"], null);
  await probe("status", ["status"], "assertStatusShape");
  await probe("sites", ["sites"], "assertSitesShape");
  await probe("list php", ["list", "php"], "assertPhpShape");
  await probe("list php --available", ["list", "php", "--available"], "assertPhpAvailableShape", {
    timeoutMs: 30000,
  });
  await probe("services", ["services"], "assertServicesShape");
  await probe("service available", ["service", "available"], "assertServiceAvailableShape");
  await probe("proxy list", ["proxy", "list"], "assertProxiesShape");
  await probe("mail list", ["mail", "list"], "assertMailListShape");
  await probe("tools", ["tools"], "assertToolsShape");
  await probe("tunnel status", ["tunnel", "status"], "assertTunnelStatusShape");
  await probe("lan status", ["lan", "status"], "assertLanStatusShape");
  await probe("doctor", ["doctor"], "assertDoctorShape", {
    acceptExit: [0, 1],
    timeoutMs: 60000,
  });
}

// ─── Phase B: Bridge liveness ─────────────────────────────────────────────────
async function phaseB() {
  console.log("\n── Phase B: Bridge liveness ──");
  try {
    const out = runTs(
      `import { runYerd } from ${JSON.stringify(CLI_TS)};\n` +
        `import { assertStatusShape } from ${JSON.stringify(VALIDATORS_TS)};\n` +
        `const ping = await runYerd(["ping"]);\n` +
        `if (ping.type !== "pong") throw new Error("ping: unexpected " + JSON.stringify(ping));\n` +
        `const status = await runYerd(["status"]);\n` +
        `assertStatusShape(status);\n` +
        `console.log("bridge OK: daemon pid", status.report.daemon_pid);\n`,
      { timeoutMs: 20000 },
    );
    console.log(`  ${out.trim()}`);
    pass("bridge ping + assertStatusShape");
  } catch (e) {
    const detail = (e.stderr?.toString() || e.message || "").slice(0, 120);
    fail("bridge ping + assertStatusShape", detail);
  }
}

// ─── Phase C: Fixture lifecycle ───────────────────────────────────────────────
async function phaseC() {
  console.log("\n── Phase C: Fixture lifecycle ──");

  // Snapshot pre-QA state
  const preSites = await yerd(["sites"]);
  const preProxies = await yerd(["proxy", "list"]);
  const preDb = await yerd(["db", "list", "mysql"]);
  const preSiteNames = new Set((preSites.data?.sites ?? []).map((s) => s.name));
  const preProxyNames = new Set((preProxies.data?.proxies ?? []).map((p) => p.name));
  const preDbNames = new Set((preDb.data?.databases ?? []).map((d) => d.name));

  // ── Site fixture ──
  if (preSiteNames.has(FIXTURE_SITE) && !ledgerHas("site:" + FIXTURE_SITE)) {
    skip("site fixture", `${FIXTURE_SITE} pre-exists (not smoke-owned)`);
  } else {
    let siteCreated = false;
    try {
      mkdirSync(FIXTURE_SITE_DIR, { recursive: true });
      ledgerAdd("site:" + FIXTURE_SITE);
      const link = await yerd(["link", FIXTURE_SITE, FIXTURE_SITE_DIR], { timeoutMs: 30000 });
      if (!link.ok) throw new Error(`link failed: exit ${link.exit} ${link.stderr}`);
      siteCreated = true;

      if (process.env.SMOKE_CRASH === "site-linked") {
        console.log("[crash-injection] SIGKILL after site link (ledger persisted)");
        process.kill(process.pid, "SIGKILL");
      }

      const r = await yerd(["sites"]);
      if (!r.data?.sites?.some((s) => s.name === FIXTURE_SITE)) {
        throw new Error("site not found after link");
      }

      const sec = await yerd(["secure", FIXTURE_SITE], { timeoutMs: 60000 });
      if (!sec.ok) throw new Error(`secure failed: exit ${sec.exit}`);
      const r2 = await yerd(["sites"]);
      const s2 = r2.data?.sites?.find((s) => s.name === FIXTURE_SITE);
      if (!s2?.secure) throw new Error("site not secured");
      const unsec = await yerd(["unsecure", FIXTURE_SITE], { timeoutMs: 60000 });
      if (!unsec.ok) throw new Error(`unsecure failed: exit ${unsec.exit}`);

      // PHP pin: `yerd use <site> <version>`
      const pin = await yerd(["use", FIXTURE_SITE, "8.4"], { timeoutMs: 30000 });
      if (!pin.ok) throw new Error(`php pin failed: exit ${pin.exit}`);
      const r3 = await yerd(["sites"]);
      const s3 = r3.data?.sites?.find((s) => s.name === FIXTURE_SITE);
      if (s3?.php !== "8.4") throw new Error(`php not pinned: ${s3?.php}`);

      // Reset PHP to the global default
      const phpR = await yerd(["list", "php"]);
      const defaultPhp = phpR.data?.default ?? "8.5";
      await yerd(["use", FIXTURE_SITE, defaultPhp], { timeoutMs: 30000 });

      pass("site fixture (link/secure/unsecure/php-pin/reset)");
    } catch (e) {
      fail("site fixture", e.message.slice(0, 100));
    } finally {
      if (siteCreated) {
        await yerd(["unlink", FIXTURE_SITE], { timeoutMs: 30000 });
      }
      rmSync(FIXTURE_SITE_DIR, { recursive: true, force: true });
      ledgerRemove("site:" + FIXTURE_SITE);
    }
  }

  // ── Proxy fixture ──
  if (preProxyNames.has(FIXTURE_PROXY) && !ledgerHas("proxy:" + FIXTURE_PROXY)) {
    skip("proxy fixture", `${FIXTURE_PROXY} pre-exists (not smoke-owned)`);
  } else {
    let proxyCreated = false;
    try {
      ledgerAdd("proxy:" + FIXTURE_PROXY);
      const add = await yerd(["proxy", "add", FIXTURE_PROXY, "http://127.0.0.1:59999"], {
        timeoutMs: 30000,
      });
      if (!add.ok) throw new Error(`proxy add failed: exit ${add.exit}`);
      proxyCreated = true;
      const r = await yerd(["proxy", "list"]);
      if (!r.data?.proxies?.some((p) => p.name === FIXTURE_PROXY)) {
        throw new Error("proxy not found after add");
      }
      pass("proxy fixture (add/verify/remove)");
    } catch (e) {
      fail("proxy fixture", e.message.slice(0, 100));
    } finally {
      if (proxyCreated) {
        await yerd(["proxy", "remove", FIXTURE_PROXY], { timeoutMs: 30000 });
      }
      ledgerRemove("proxy:" + FIXTURE_PROXY);
    }
  }

  // ── Database fixture ──
  if (preDbNames.has(FIXTURE_DB) && !ledgerHas("db:" + FIXTURE_DB)) {
    skip("db fixture", `${FIXTURE_DB} pre-exists (not smoke-owned)`);
  } else if (!preDb.ok) {
    skip("db fixture", "mysql not reachable (db list failed)");
  } else {
    let dbCreated = false;
    const backupPath = join(tmpdir(), `${FIXTURE_DB}-smoke-backup.sql`);
    try {
      ledgerAdd("db:" + FIXTURE_DB);
      const create = await yerd(["db", "create", "mysql", FIXTURE_DB], { timeoutMs: 30000 });
      if (!create.ok) throw new Error(`db create failed: exit ${create.exit}`);
      dbCreated = true;
      const r = await yerd(["db", "list", "mysql"]);
      if (!r.data?.databases?.some((d) => d.name === FIXTURE_DB)) {
        throw new Error("db not found after create");
      }

      // Backup requires a destination path; response is {type:"ok"}
      const bak = await yerd(["db", "backup", "mysql", FIXTURE_DB, backupPath], {
        timeoutMs: 120000,
      });
      if (!bak.ok) throw new Error(`db backup failed: exit ${bak.exit}`);
      if (!existsSync(backupPath)) throw new Error("backup file not created at " + backupPath);

      pass("db fixture (create/backup/drop)");
    } catch (e) {
      fail("db fixture", e.message.slice(0, 100));
    } finally {
      if (dbCreated) {
        await yerd(["db", "drop", "mysql", FIXTURE_DB], { timeoutMs: 30000 });
      }
      rmSync(backupPath, { force: true });
      ledgerRemove("db:" + FIXTURE_DB);
    }
  }

  // ── Post-QA snapshot equality (zero residue) ──
  const postSites = await yerd(["sites"]);
  const postProxies = await yerd(["proxy", "list"]);
  const postDb = await yerd(["db", "list", "mysql"]);
  const postSiteNames = new Set((postSites.data?.sites ?? []).map((s) => s.name));
  const postProxyNames = new Set((postProxies.data?.proxies ?? []).map((p) => p.name));
  const postDbNames = new Set((postDb.data?.databases ?? []).map((d) => d.name));

  const diff = (pre, post) =>
    [...post].filter((n) => !pre.has(n)).concat([...pre].filter((n) => !post.has(n)));

  const siteDiff = diff(preSiteNames, postSiteNames);
  if (siteDiff.length > 0) fail("zero-residue: sites unchanged", siteDiff.join(","));
  else pass("zero-residue: sites unchanged");

  const proxyDiff = diff(preProxyNames, postProxyNames);
  if (proxyDiff.length > 0) fail("zero-residue: proxies unchanged", proxyDiff.join(","));
  else pass("zero-residue: proxies unchanged");

  const dbDiff = diff(preDbNames, postDbNames);
  if (dbDiff.length > 0) fail("zero-residue: databases unchanged", dbDiff.join(","));
  else pass("zero-residue: databases unchanged");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
await startupRecovery();
forbiddenOpsCheck();
await phaseA();
await phaseB();
await phaseC();
rmSync(PAYLOAD_PATH, { force: true });
printTable();
