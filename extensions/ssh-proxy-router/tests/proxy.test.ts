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
  let occupiedPort = 0;
  let wrongInstance = false;
  let socksPort = 1080;
  let pacPort = 18080;
  if (active) {
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, "pac-instance.json"),
      JSON.stringify({ id: "test-instance", port: pacPort }),
    );
  }
  const dependencies: Partial<ProxyDependencies> = {
    home,
    uid: 501,
    fs,
    waitUntil: async (check) => check(),
    isPortOpen: async (port) =>
      port === occupiedPort ||
      (port !== portClosed && ((port === socksPort && jobs.has("ssh")) || (port === pacPort && jobs.has("pac")))),
    execute: async (file, args) => {
      calls.push([file, ...args]);
      if (failure(args)) throw new Error("simulated failure");
      if (file.endsWith("launchctl")) {
        const job = /\.ssh(?:\.plist)?$/.test(args.at(-1)!) ? "ssh" : "pac";
        if (args[0] === "print") {
          if (!jobs.has(job)) throw new Error("Could not find service");
          return "state = running\nruns = 3\nlast exit code = 0";
        }
        if (args[0] === "bootstrap") {
          const plist = await fs.readFile(args.at(-1)!, "utf8");
          if (job === "ssh") socksPort = Number(plist.match(/127\.0\.0\.1:(\d+)/)![1]);
          else pacPort = Number(plist.match(/<string>(\d+)<\/string>/)![1]);
          jobs.add(job);
        }
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
      if (file.endsWith("curl")) {
        if (args.includes("--write-out")) return http;
        if (args.includes("--include")) {
          const instance = JSON.parse(await fs.readFile(path.join(stateDir, "pac-instance.json"), "utf8"));
          return `HTTP/1.0 200 OK\r\nX-Router-Instance: ${wrongInstance ? "foreign" : instance.id}\r\n\r\n${content}`;
        }
        return content;
      }
      throw new Error(`Unexpected command ${file}`);
    },
  };
  return {
    home,
    stateDir,
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
    occupyPort: (value: number) => {
      occupiedPort = value;
    },
    wrongInstance: () => {
      wrongInstance = true;
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
test("failed restoration retains agents and backup, then a retry restores and stops", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  h.setFailure((args) => args[0] === "-setautoproxyurl" && args[2] === "https://old.example/proxy.pac");
  await assert.rejects(h.proxy.stopProxy(), /restore/);
  await fs.access(h.backup);
  assert.equal(h.jobs.size, 2);
  h.setFailure(() => false);
  await h.proxy.stopProxy();
  assert.equal(h.jobs.size, 0);
  await assert.rejects(fs.access(h.backup));
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
  assert.deepEqual(await fs.readdir(h.stateDir), ["pac-instance.json"]);
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

for (const issue of ["occupied PAC port", "foreign PAC identity", "wrong PAC body", "PAC bind failure"]) {
  test(`${issue} prevents enabling routing`, async (t) => {
    const h = await harness(t);
    if (issue === "occupied PAC port") h.occupyPort(18080);
    if (issue === "foreign PAC identity") h.wrongInstance();
    if (issue === "wrong PAC body") h.setContent("foreign PAC");
    if (issue === "PAC bind failure") {
      const execute = h.dependencies.execute!;
      h.dependencies.execute = async (file, args, timeout) => {
        const result = await execute(file, args, timeout);
        return args[0] === "print" && args.at(-1)!.endsWith(".pac") ? "state = waiting" : result;
      };
    }
    await assert.rejects(createProxyController(config, h.dependencies).startProxy());
    assert.equal(
      h.calls.some((call) => call[1] === "-setautoproxystate" && call[3] === "on"),
      false,
    );
    assert.equal(h.jobs.size, 0);
  });
}

test("failed PAC unload prevents replacement and preserves the error", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  h.services.get("Ethernet")!.enabled = false;
  h.calls.length = 0;
  h.setFailure((args) => args[0] === "bootout" && args.at(-1)!.endsWith(".pac"));
  await assert.rejects(h.proxy.startProxy(), /simulated failure/);
  assert.equal(
    h.calls.some((call) => call[1] === "bootstrap"),
    false,
  );
  assert.equal(h.jobs.has("pac"), true);
});

test("startup rollback failure retains agents, backup and both errors", async (t) => {
  const h = await harness(t);
  let enabling = false;
  h.setFailure((args) => {
    if (args[0] === "-setautoproxystate" && args[1] === "Ethernet" && args[2] === "on") {
      enabling = true;
      return true;
    }
    return enabling && args[0] === "-setautoproxyurl" && args[2] === "https://old.example/proxy.pac";
  });
  await assert.rejects(h.proxy.startProxy(), /Could not start.*simulated failure.*restoration:.*restore/);
  assert.equal(h.jobs.size, 2);
  await fs.access(h.backup);
  h.setFailure(() => false);
  await h.proxy.stopProxy();
  assert.equal(h.jobs.size, 0);
});

test("Repair merges new service backups and restores removed services", async (t) => {
  const h = await harness(t);
  const original = structuredClone([...h.services]);
  const wifi = createProxyController({ ...config, networkServices: ["Wi-Fi"] }, h.dependencies);
  await wifi.startProxy();
  const first = JSON.parse(await fs.readFile(h.backup, "utf8"));
  assert.deepEqual(
    first.map((entry: { service: string }) => entry.service),
    ["Wi-Fi"],
  );
  await h.proxy.startProxy();
  const merged = JSON.parse(await fs.readFile(h.backup, "utf8"));
  assert.deepEqual(merged[0], first[0]);
  assert.equal(merged.length, 2);
  const ethernet = createProxyController({ ...config, networkServices: ["Ethernet"] }, h.dependencies);
  assert.equal((await ethernet.getProxyStatus()).degraded, true);
  await ethernet.startProxy();
  assert.deepEqual(h.services.get("Wi-Fi"), original[0][1]);
  assert.equal(JSON.parse(await fs.readFile(h.backup, "utf8")).length, 2);
  await ethernet.stopProxy();
  assert.deepEqual([...h.services], original);
});

test("backup persistence failure causes no network or agent mutation", async (t) => {
  const h = await harness(t);
  const failingFs = new Proxy(fs, {
    get(target, key) {
      if (key === "rename")
        return async () => {
          throw new Error("disk failure");
        };
      return Reflect.get(target, key);
    },
  });
  await assert.rejects(
    createProxyController(config, { ...h.dependencies, fs: failingFs }).startProxy(),
    /disk failure/,
  );
  assert.equal(
    h.calls.some((call) => call[1].startsWith("-set") || ["bootstrap", "bootout"].includes(call[1])),
    false,
  );
  assert.equal(
    (await fs.readdir(h.stateDir)).some((file) => file.endsWith(".tmp")),
    false,
  );
});

for (const backup of ["{", "{}", "[]", '[{"service":"Wi-Fi"}]']) {
  test(`invalid backup ${backup} is retained without mutations`, async (t) => {
    const h = await harness(t);
    await fs.mkdir(h.stateDir, { recursive: true });
    await fs.writeFile(h.backup, backup);
    await assert.rejects(h.proxy.startProxy(), /saved proxy settings/);
    await assert.rejects(h.proxy.stopProxy(), /saved proxy settings/);
    assert.equal(await fs.readFile(h.backup, "utf8"), backup);
    assert.equal(
      h.calls.some((call) => call[1].startsWith("-set") || ["bootstrap", "bootout"].includes(call[1])),
      false,
    );
  });
}

for (const change of [
  { sshUser: "other" },
  { sshHost: "other.example" },
  { sshPort: 2222 },
  { identityFile: "/tmp/other-key" },
  { socksPort: 1081 },
]) {
  test(`Repair activates changed SSH configuration ${JSON.stringify(change)}`, async (t) => {
    const h = await harness(t);
    await h.proxy.startProxy();
    h.calls.length = 0;
    const updated = { ...config, ...change };
    h.setContent(buildPac(updated));
    const proxy = createProxyController(updated, h.dependencies);
    assert.equal((await proxy.getProxyStatus()).degraded, true);
    await proxy.startProxy();
    assert.equal((await proxy.getProxyStatus()).running, true);
    assert.equal(h.calls.filter((call) => call[1] === "bootstrap" && call.at(-1)!.endsWith(".ssh.plist")).length, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(h.stateDir, "ssh-active.json"), "utf8")), [
      updated.sshUser,
      updated.sshHost,
      updated.sshPort,
      updated.identityFile ?? null,
      updated.socksPort,
    ]);
  });
}

test("unchanged SSH settings reuse the tunnel during routing Repair", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  h.calls.length = 0;
  await h.proxy.startProxy();
  assert.equal(
    h.calls.some((call) => call[1] === "bootstrap"),
    false,
  );
  h.services.get("Ethernet")!.enabled = false;
  await h.proxy.startProxy();
  assert.equal(
    h.calls.some((call) => call[1] === "bootstrap" && call.at(-1)!.endsWith(".ssh.plist")),
    false,
  );
});

test("legacy state requires Repair and failed SSH replacement cannot appear healthy", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  await fs.rm(path.join(h.stateDir, "ssh-active.json"));
  await fs.rm(path.join(h.stateDir, "pac-instance.json"));
  assert.equal((await h.proxy.getProxyStatus()).degraded, true);
  await h.proxy.startProxy();
  assert.equal((await h.proxy.getProxyStatus()).running, true);
  const proxy = createProxyController({ ...config, sshHost: "unreachable.example" }, h.dependencies);
  h.setFailure((args) => args[0] === "bootstrap" && args.at(-1)!.endsWith(".ssh.plist"));
  await assert.rejects(proxy.startProxy());
  assert.equal((await proxy.getProxyStatus()).running, false);
  await assert.rejects(fs.access(path.join(h.stateDir, "ssh-active.json")));
});

test("lifecycle lock covers Toggle's status decision and rejects overlapping controllers", async (t) => {
  const h = await harness(t);
  let proceed!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    proceed = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const execute = h.dependencies.execute!;
  let paused = false;
  const proxy = createProxyController(config, {
    ...h.dependencies,
    execute: async (file, args, timeout) => {
      if (!paused && args[0] === "print") {
        paused = true;
        entered();
        await gate;
      }
      return execute(file, args, timeout);
    },
  });
  const operation = proxy.toggleProxy();
  try {
    await ready;
    await assert.rejects(h.proxy.stopProxy(), /Another router operation is in progress/);
    await assert.rejects(h.proxy.startProxy(), /Another router operation is in progress/);
  } finally {
    proceed();
  }
  assert.equal((await operation).running, true);
  await h.proxy.stopProxy();
});

test("lost lock aborts subsequent mutations", async (t) => {
  const h = await harness(t);
  let lost = false;
  const execute = h.dependencies.execute!;
  const proxy = createProxyController(config, {
    ...h.dependencies,
    acquireLock: async () => ({
      assertHeld: () => {
        if (lost) throw new Error("lock lost");
      },
      release: async () => {},
    }),
    execute: async (file, args, timeout) => {
      const output = await execute(file, args, timeout);
      if (args[0] === "-getautoproxyurl") lost = true;
      return output;
    },
  });
  await assert.rejects(proxy.startProxy(), /lock lost/);
  assert.equal(
    h.calls.some((call) => call[1].startsWith("-set") || ["bootstrap", "bootout"].includes(call[1])),
    false,
  );
});

test("existing state, logs, snapshots and plists become owner-only", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  const snapshotFile = path.join(h.stateDir, "diagnostic-config.json");
  await writeSnapshot(snapshot, snapshotFile);
  const files = (await fs.readdir(h.stateDir)).map((file) => path.join(h.stateDir, file));
  const agents = path.join(h.home, "Library", "LaunchAgents");
  files.push(...(await fs.readdir(agents)).map((file) => path.join(agents, file)));
  for (const file of files) await fs.chmod(file, 0o644);
  await fs.chmod(h.stateDir, 0o755);
  const before = (await fs.stat(snapshotFile)).mtimeMs;
  await writeSnapshot(snapshot, snapshotFile);
  assert.equal((await fs.stat(snapshotFile)).mode & 0o777, 0o600);
  assert.equal((await fs.stat(snapshotFile)).mtimeMs, before);
  await h.proxy.startProxy();
  assert.equal((await fs.stat(h.stateDir)).mode & 0o777, 0o700);
  for (const file of files) assert.equal((await fs.stat(file)).mode & 0o777, 0o600, file);
  assert.equal((await fs.stat(agents)).mode & 0o777, 0o755);
});

test("failed restoration before Repair leaves both original agents loaded", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  h.calls.length = 0;
  h.setFailure((args) => args[0] === "-setautoproxyurl" && args[2] === "https://old.example/proxy.pac");
  const proxy = createProxyController({ ...config, sshHost: "changed.example" }, h.dependencies);
  await assert.rejects(proxy.startProxy(), /Could not restore/);
  assert.equal(h.jobs.size, 2);
  await fs.access(h.backup);
  assert.equal(
    h.calls.some((call) => ["bootstrap", "bootout", "disable"].includes(call[1])),
    false,
  );
});

test("launchctl inspection failure is not mistaken for an unloaded job", async (t) => {
  const h = await harness(t);
  await h.proxy.startProxy();
  h.calls.length = 0;
  h.setFailure((args) => args[0] === "print");
  await assert.rejects(h.proxy.startProxy(), /simulated failure/);
  assert.equal(
    h.calls.some((call) => ["bootstrap", "bootout", "disable"].includes(call[1])),
    false,
  );
});
