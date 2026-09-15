import assert from "node:assert/strict";
import { test } from "node:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildPac,
  createProxyController,
  evaluatePac,
  pacURL,
  parsePreferences,
  Preferences,
  ProxyDependencies,
} from "../src/proxy-core";
import { readSnapshot, validateSnapshot, writeSnapshot } from "../src/diagnostic-snapshot";

const preferences: Preferences = {
  sshUser: "user",
  sshHost: "gateway.example",
  sshPort: "22",
  routedHosts: "exact.example, *.corp.example",
  primaryURL: "https://exact.example/review",
  socksPort: "1080",
  pacPort: "18080",
  startTimeout: "1",
  networkServices: "Wi-Fi, Ethernet",
  openInSafari: true,
};
const config = parsePreferences(preferences);
const snapshot = {
  schemaVersion: 1 as const,
  routedHosts: config.routedHosts,
  primaryURL: config.primaryURL,
  socksPort: config.socksPort,
  pacPort: config.pacPort,
  networkServices: ["Wi-Fi", "Ethernet"],
};

async function harness(t: { after: (fn: () => Promise<void>) => void }, active = false) {
  const home = await fs.mkdtemp(path.join(tmpdir(), "router-test-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const stateDir = path.join(home, ".local/state/raycast-ssh-proxy-router");
  const backup = path.join(stateDir, "automatic-proxy-backup.json");
  const jobs = new Set(active ? ["ssh", "pac"] : []);
  const services = new Map(
    ["Wi-Fi", "Ethernet"].map((service) => [
      service,
      { url: active ? pacURL(config) : "https://old.example/proxy.pac", enabled: active },
    ]),
  );
  const calls: string[][] = [];
  let failure: (args: string[]) => boolean = () => false;
  let content = buildPac(config);
  let http = "200";
  let portClosed = 0;
  const dependencies: Partial<ProxyDependencies> = {
    home,
    uid: 501,
    fs,
    waitUntil: async (check) => check(),
    isPortOpen: async (port) => port !== portClosed && jobs.has(port === 1080 ? "ssh" : "pac"),
    execute: async (file, args) => {
      calls.push([file, ...args]);
      if (failure(args)) throw new Error("simulated failure");
      if (file.endsWith("launchctl")) {
        const job = /\.ssh(?:\.plist)?$/.test(args.at(-1)!) ? "ssh" : "pac";
        if (args[0] === "print") {
          if (!jobs.has(job)) throw new Error("not loaded");
          return "state = running\nruns = 3\nlast exit code = 0";
        }
        if (args[0] === "bootstrap") jobs.add(job);
        if (args[0] === "bootout") jobs.delete(job);
        return "";
      }
      if (file.endsWith("networksetup")) {
        if (args[0] === "-listallnetworkservices")
          return "An asterisk denotes disabled services\nWi-Fi\nEthernet\n*Disabled";
        const service = services.get(args[1]);
        if (!service) throw new Error("unknown service");
        if (args[0] === "-getautoproxyurl") return `URL: ${service.url}\nEnabled: ${service.enabled ? "Yes" : "No"}`;
        if (args[0] === "-setautoproxyurl") service.url = args[2];
        if (args[0] === "-setautoproxystate") service.enabled = args[2] === "on";
        return "";
      }
      if (file.endsWith("curl")) return args.includes("--write-out") ? http : content;
      throw new Error(`Unexpected command ${file}`);
    },
  };
  return {
    home,
    backup,
    jobs,
    services,
    calls,
    dependencies,
    proxy: createProxyController(config, dependencies),
    setFailure: (fn: typeof failure) => {
      failure = fn;
    },
    setContent: (value: string) => {
      content = value;
    },
    setHttp: (value: string) => {
      http = value;
    },
    closePort: (value: number) => {
      portClosed = value;
    },
  };
}

test("normalizes URLs, case, trailing dots, separators and duplicate rules", () => {
  assert.deepEqual(
    parsePreferences({ ...preferences, routedHosts: "HTTPS://EXACT.EXAMPLE./path; exact.example\n*.corp.example" })
      .routedHosts,
    config.routedHosts,
  );
});
for (const [name, change] of Object.entries({
  empty: { routedHosts: " ; " },
  glob: { routedHosts: "foo.*.example" },
  lowPort: { socksPort: "80" },
  highPort: { pacPort: "65536" },
  fractional: { sshPort: "22.5" },
  timeout: { startTimeout: "0" },
  protocol: { primaryURL: "file:///etc/passwd" },
})) {
  test(`rejects invalid configuration: ${name}`, () =>
    assert.throws(() => parsePreferences({ ...preferences, ...change })));
}
test("PAC routes exact hosts and bounded wildcards, leaving unrelated hosts direct", () => {
  const pac = buildPac(config);
  for (const host of ["exact.example", "EXACT.EXAMPLE", "corp.example", "a.corp.example", "a.b.corp.example"])
    assert.equal(evaluatePac(pac, host), "SOCKS 127.0.0.1:1080");
  for (const host of ["child.exact.example", "notcorp.example", "corp.example.attacker.invalid", "unrelated.invalid"])
    assert.equal(evaluatePac(pac, host), "DIRECT");
  assert.notEqual(pacURL(config), pacURL({ ...config, socksPort: 1081 }));
  assert.notEqual(pacURL(config), pacURL({ ...config, routedHosts: [{ host: "changed.example", wildcard: false }] }));
});
test("PAC evaluation has a timeout", () =>
  assert.throws(() => evaluatePac("while(true) {}", "example.com"), /timed out/));

test("snapshot round trip is private, minimal, atomic and unchanged writes are skipped", async (t) => {
  const h = await harness(t);
  const file = path.join(h.home, "snapshot.json");
  await writeSnapshot({ ...snapshot, ...config }, file);
  assert.deepEqual(await readSnapshot(file), snapshot);
  const before = await fs.stat(file);
  assert.equal(before.mode & 0o777, 0o600);
  await writeSnapshot(snapshot, file);
  assert.equal((await fs.stat(file)).mtimeMs, before.mtimeMs);
  await writeSnapshot({ ...snapshot, socksPort: 1081 }, file);
  assert.equal((await readSnapshot(file)).socksPort, 1081);
  assert.deepEqual(await fs.readdir(h.home), ["snapshot.json"]);
  assert.equal((await fs.readFile(file, "utf8")).includes("sshUser"), false);
});
test("snapshot errors are actionable and invalid data is rejected", async (t) => {
  const h = await harness(t);
  await assert.rejects(readSnapshot(path.join(h.home, "missing")), /refresh/);
  for (const value of [
    null,
    {},
    { ...snapshot, schemaVersion: 2 },
    { ...snapshot, socksPort: 0 },
    { ...snapshot, networkServices: [] },
    { ...snapshot, routedHosts: [{ host: "UPPER.EXAMPLE", wildcard: false }] },
    { ...snapshot, primaryURL: "https://user:secret@example.com" },
  ])
    assert.throws(() => validateSnapshot(value));
  const file = path.join(h.home, "malformed");
  await fs.writeFile(file, "{");
  await assert.rejects(readSnapshot(file), /Cannot load/);
});

test("status detects stopped, healthy, reconnecting, and partial routing", async (t) => {
  const h = await harness(t);
  assert.equal((await h.proxy.getProxyStatus()).degraded, false);
  await h.proxy.startProxy();
  assert.equal((await h.proxy.getProxyStatus()).running, true);
  h.closePort(1080);
  assert.match((await h.proxy.getProxyStatus()).detail, /Reconnecting/);
  h.closePort(0);
  h.services.get("Ethernet")!.enabled = false;
  assert.equal((await h.proxy.getProxyStatus()).degraded, true);
});
test("start/stop preserves prior PAC settings and removes backup only after restoration", async (t) => {
  const h = await harness(t);
  const original = structuredClone([...h.services]);
  await h.proxy.startProxy();
  assert.equal(h.jobs.size, 2);
  await fs.access(h.backup);
  await h.proxy.stopProxy();
  assert.deepEqual([...h.services], original);
  assert.equal(h.jobs.size, 0);
  await assert.rejects(fs.access(h.backup));
});
test("SSH readiness failure unloads the new tunnel", async (t) => {
  const h = await harness(t);
  h.closePort(1080);
  await assert.rejects(h.proxy.startProxy(), /did not become ready/);
  assert.equal(h.jobs.size, 0);
});
test("PAC startup failure cleans up newly started SSH", async (t) => {
  const h = await harness(t);
  h.setFailure((args) => args[0] === "bootstrap" && args.at(-1)!.includes(".pac"));
  await assert.rejects(h.proxy.startProxy(), /simulated failure/);
  assert.equal(h.jobs.size, 0);
});
test("partial network setup failure restores every service", async (t) => {
  const h = await harness(t);
  const original = structuredClone([...h.services]);
  h.setFailure((args) => args[0] === "-setautoproxystate" && args[1] === "Ethernet" && args[2] === "on");
  await assert.rejects(h.proxy.startProxy());
  assert.deepEqual([...h.services], original);
  assert.equal(h.jobs.size, 0);
});
test("failed restoration retains the backup for recovery and still attempts agent cleanup", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  h.setFailure((args) => args[0] === "-setautoproxyurl" && args[2] === "https://old.example/proxy.pac");
  await assert.rejects(h.proxy.stopProxy(), /restore/);
  await fs.access(h.backup);
  assert.equal(h.jobs.size, 0);
});
test("startup cleanup failure preserves original error and still attempts SSH cleanup", async (t) => {
  const h = await harness(t);
  h.setFailure(
    (args) =>
      (args[0] === "-setautoproxystate" && args[2] === "on") ||
      (args[0] === "disable" && args.at(-1)!.includes(".pac")),
  );
  await assert.rejects(h.proxy.startProxy(), /Could not start.*cleanup/);
  assert.equal(h.jobs.has("ssh"), false);
});

test("live diagnostics are read-only, deduplicate targets, and report HTTP authentication responses", async (t) => {
  const h = await harness(t, true);
  h.setHttp("403");
  const readonlyFs = new Proxy(fs, {
    get(target, key) {
      if (["writeFile", "mkdir", "rm", "rename", "chmod"].includes(String(key)))
        return () => {
          throw new Error("unexpected write");
        };
      return Reflect.get(target, key);
    },
  });
  const report = await createProxyController(snapshot, { ...h.dependencies, fs: readonlyFs }).runDiagnostics();
  assert.equal(report.passed, true);
  assert.equal(report.checks.filter((check) => check.name.startsWith("Website:")).length, 1);
  assert.match(report.checks.at(-1)!.detail, /HTTP 403/);
  for (const [file, ...args] of h.calls) {
    if (file.endsWith("launchctl")) assert.equal(args[0], "print");
    if (file.endsWith("networksetup")) assert.equal(args[0], "-getautoproxyurl");
    if (file.endsWith("curl")) {
      assert.equal(args[0], "-q");
      assert.ok(args.includes("--noproxy"));
      assert.ok(!args.includes("--insecure"));
    }
  }
  const websiteCall = h.calls.find((call) => call.includes("--write-out"))!;
  assert.ok(websiteCall.includes("--socks5-hostname"));
  assert.equal(websiteCall[websiteCall.indexOf("--noproxy") + 1], "");
  assert.deepEqual(await fs.readdir(h.home), []);
});
for (const scenario of ["agent", "settings", "stale PAC", "PAC timeout", "TLS failure", "HTTP missing"]) {
  test(`live diagnostics fail clearly: ${scenario}`, async (t) => {
    const h = await harness(t, true);
    if (scenario === "agent") h.jobs.delete("ssh");
    if (scenario === "settings") h.services.get("Wi-Fi")!.enabled = false;
    if (scenario === "stale PAC") h.setContent("while (true) {}");
    if (scenario === "PAC timeout") h.setFailure((args) => args.includes("--fail"));
    if (scenario === "TLS failure") h.setFailure((args) => args.includes("--write-out"));
    if (scenario === "HTTP missing") h.setHttp("000");
    const report = await h.proxy.runDiagnostics();
    assert.equal(report.passed, false);
    assert.ok(report.checks.some((check) => check.status === "fail"));
    if (scenario === "stale PAC")
      assert.equal(report.checks.find((check) => check.name === "PAC routing decisions")!.status, "skipped");
    if (scenario === "agent")
      assert.equal(
        h.calls.some((call) => call.includes("--write-out")),
        false,
      );
  });
}
