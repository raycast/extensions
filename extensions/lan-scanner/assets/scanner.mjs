#!/usr/bin/env node
// LAN scanner — runs detached from Raycast, writes progress + results to <dataDir>/state.json.
// Usage: node scanner.mjs <dataDir> [--force-ports] [--host <ip>] [--port-max-age-h <n>]
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { httpFingerprint, listenTuya, tuyaFingerprint } from "./fingerprint.mjs";

const argv = process.argv.slice(2);
const dataDir = argv[0];
if (!dataDir) {
  console.error("usage: scanner.mjs <dataDir> [--force-ports] [--host ip]");
  process.exit(2);
}
const flag = (n) => argv.includes(n);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const FORCE_PORTS = flag("--force-ports");
const ONLY_HOST = opt("--host", null);
const PORT_MAX_AGE_MS = Number(opt("--port-max-age-h", "12")) * 3600_000;

const STATE = path.join(dataDir, "state.json");
const LOCK = path.join(dataDir, "scan.lock");
const LOG = path.join(dataDir, "scan.log");
process.env.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH ?? ""}`;
fs.mkdirSync(dataDir, { recursive: true });

const log = (...a) => fs.appendFileSync(LOG, `${new Date().toISOString()} ${a.join(" ")}\n`);

// ---------- helpers ----------
function run(cmd, args, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) =>
      resolve({ ok: !err, out: stdout?.toString() ?? "" }),
    );
  });
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx], idx);
      }
    }),
  );
}
const ip2n = (ip) => ip.split(".").reduce((a, o) => a * 256 + Number(o), 0);
const n2ip = (n) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join(".");
const normMac = (m) =>
  m
    .split(":")
    .map((p) => p.padStart(2, "0"))
    .join(":")
    .toLowerCase();

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return { devices: {} };
  }
}
let state = readState();
state.devices ??= {};
function save() {
  const tmp = `${STATE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, STATE);
}
// custom names live in names.json (written by the UI); keep them when a device key changes
function moveName(from, to) {
  const file = path.join(dataDir, "names.json");
  try {
    const names = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!(from in names)) return;
    names[to] ??= names[from];
    delete names[from];
    fs.writeFileSync(file, JSON.stringify(names, null, 1));
  } catch {}
}
function setScan(patch) {
  // re-read devices edited by the UI (forget) is not needed; UI only writes via its own file.
  state.scan = { ...(state.scan ?? {}), ...patch };
  save();
}

// ---------- lock ----------
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function readPid(file) {
  try {
    const txt = fs.readFileSync(file, "utf8").trim();
    if (txt) return Number(txt);
    // empty file: its owner is between create and write, unless it is old (owner crashed there)
    return Date.now() - fs.statSync(file).mtimeMs > 5000 ? 0 : null;
  } catch {
    return undefined; // file is gone
  }
}
function takeLock() {
  for (let i = 0; i < 10; i++) {
    try {
      const fd = fs.openSync(LOCK, "wx"); // atomic: fails if the file exists
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    const pid = readPid(LOCK);
    if (pid === undefined) continue; // released meanwhile, try again
    if (pid === null) {
      sleepMs(100);
      continue;
    }
    if (pid && alive(pid)) return false;
    // Stale lock: move it aside under a name only we use. rename() is atomic, so only one process wins.
    const aside = `${LOCK}.${process.pid}.stale`;
    try {
      fs.renameSync(LOCK, aside);
    } catch {
      continue;
    }
    const moved = readPid(aside);
    if (moved && moved !== pid && alive(moved)) {
      // another scanner replaced the stale lock before our rename: give its lock back
      // (link() never overwrites, so a lock created in the meantime is kept)
      try {
        fs.linkSync(aside, LOCK);
      } catch {}
      fs.rmSync(aside, { force: true });
      return false;
    }
    fs.rmSync(aside, { force: true });
  }
  return false;
}
if (!takeLock()) {
  console.error("scan already running");
  process.exit(0);
}
const cleanup = () => {
  try {
    if (Number(fs.readFileSync(LOCK, "utf8")) === process.pid) fs.unlinkSync(LOCK);
  } catch {}
};
process.on("exit", cleanup);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(1));

// ---------- vendor db (nmap OUI list, fallback none) ----------
let ouiDb = null;
function vendorOf(mac) {
  const first = parseInt(mac.slice(0, 2), 16);
  if (first & 0x02) return { vendor: "Private (randomized MAC)", randomMac: true };
  if (!ouiDb) {
    ouiDb = new Map();
    for (const f of ["/opt/homebrew/share/nmap/nmap-mac-prefixes", "/usr/local/share/nmap/nmap-mac-prefixes"]) {
      if (!fs.existsSync(f)) continue;
      for (const line of fs.readFileSync(f, "utf8").split("\n")) {
        if (!line || line[0] === "#") continue;
        const sp = line.indexOf(" ");
        ouiDb.set(line.slice(0, sp).toUpperCase(), line.slice(sp + 1).trim());
      }
      break;
    }
  }
  const hex = mac.replace(/:/g, "").toUpperCase();
  // nmap file has 6-, 7- and 9-hex-digit prefixes; longest match wins
  for (const len of [9, 7, 6]) {
    const v = ouiDb.get(hex.slice(0, len));
    if (v) return { vendor: v, randomMac: false };
  }
  return { vendor: null, randomMac: false };
}

// ---------- network discovery ----------
async function getNetwork() {
  const r = await run("route", ["-n", "get", "default"]);
  const iface = r.out.match(/interface:\s*(\S+)/)?.[1] ?? "en0";
  const gateway = r.out.match(/gateway:\s*(\S+)/)?.[1] ?? null;
  const ifc = (await run("ifconfig", [iface])).out;
  const m = ifc.match(/inet (\d+\.\d+\.\d+\.\d+) netmask 0x([0-9a-f]+)/);
  if (!m) throw new Error(`no IPv4 on ${iface}`);
  const selfIp = m[1];
  let mask = parseInt(m[2], 16);
  let bits = 32 - Math.log2(2 ** 32 - mask);
  if (bits < 22) bits = 22; // cap at 1022 hosts to stay light
  mask = (2 ** 32 - 2 ** (32 - bits)) >>> 0;
  const base = (ip2n(selfIp) & mask) >>> 0;
  const size = 2 ** (32 - bits);
  const selfMac = normMac(ifc.match(/ether ([0-9a-f:]+)/)?.[1] ?? "00:00:00:00:00:00");
  return { iface, gateway, selfIp, selfMac, cidr: `${n2ip(base)}/${bits}`, base, size };
}

async function pingSweep(netw) {
  const ips = [];
  for (let n = netw.base + 1; n < netw.base + netw.size - 1; n++) ips.push(n2ip(n));
  const replied = new Set();
  let done = 0;
  await pool(ips, 48, async (ip) => {
    const r = await run("ping", ["-c", "1", "-W", "700", "-q", ip], 3000);
    if (r.ok) replied.add(ip);
    if (++done % 32 === 0) setScan({ phase: "Ping sweep", done, total: ips.length });
  });
  return replied;
}

async function readArp(iface) {
  const r = await run("arp", ["-anx", "-i", iface]);
  const out = new Map();
  for (const line of r.out.split("\n").slice(1)) {
    const [ip, mac, expO] = line.trim().split(/\s+/);
    if (!ip || !mac || !/^[0-9a-f]{1,2}(:[0-9a-f]{1,2}){5}$/i.test(mac) || mac === "ff:ff:ff:ff:ff:ff") continue;
    out.set(ip, { mac: normMac(mac), fresh: expO && expO !== "expired" });
  }
  return out;
}

// ---------- names ----------
async function reverseName(ip, server, port = 53) {
  const args = ["-x", ip, "+short", "+time=1", "+tries=1"];
  if (server) args.push(`@${server}`);
  if (port !== 53) args.push("-p", String(port));
  const r = await run("dig", args, 3000);
  const name = r.out
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s && !s.startsWith(";"));
  return name ? name.replace(/\.$/, "") : null;
}

// ---------- port scan via nmap (connect scan, no root) ----------
const hasNmap = fs.existsSync("/opt/homebrew/bin/nmap") || fs.existsSync("/usr/local/bin/nmap");
const QUICK_PORTS = [21, 22, 23, 53, 80, 81, 139, 443, 445, 548, 554, 631, 1883, 3000, 3389, 5000, 5353, 5900, 7000, 8000, 8008, 8009, 8080, 8123, 8443, 8883, 9100, 32400, 49152, 62078];

let portSpec = null;
async function getPortSpec() {
  if (portSpec) return portSpec;
  const r = await run("nmap", ["-sT", "--top-ports", "300", "-oX", "-", "-n", "-Pn", "--max-retries", "0", "--host-timeout", "1s", "127.0.0.1"], 15_000);
  const top = r.out.match(/services="([^"]*,[^"]*)"/)?.[1];
  portSpec = [top, "1883,3000,5353,6053,6668,8009,8123,8883,32400,49152,62078"].filter(Boolean).join(",");
  return portSpec;
}

async function nmapScan(ip) {
  const ports = await getPortSpec();
  const r = await run(
    "nice",
    ["-n", "10", "nmap", "-sT", "-Pn", "-sV", "--version-light", "-p", ports, "-T4", "--host-timeout", "120s", "--script", "http-title", "-oX", "-", ip],
    180_000,
  );
  const found = [];
  for (const m of r.out.matchAll(/<port protocol="(\w+)" portid="(\d+)">([\s\S]*?)<\/port>/g)) {
    const body = m[3];
    if (!/<state state="open"/.test(body)) continue;
    const attr = (name) => body.match(new RegExp(`<service[^>]*\\b${name}="([^"]*)"`))?.[1] ?? null;
    const title = body.match(/<script id="http-title" output="([^"]*)"/)?.[1] ?? null;
    found.push({
      port: Number(m[2]),
      proto: m[1],
      service: attr("name"),
      product: [attr("product"), attr("version")].filter(Boolean).join(" ") || null,
      extra: attr("extrainfo"),
      title: title && !/did not follow|Site doesn't have a title/i.test(title) ? decode(title) : null,
    });
  }
  const osHint = r.out.match(/<service[^>]*ostype="([^"]*)"/)?.[1] ?? null;
  return { ports: found, osHint, ok: r.ok || found.length > 0 };
}
const decode = (s) => s.replace(/&#xa;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

async function quickScan(ip) {
  // fallback when nmap is missing: plain TCP connect on a short list
  const ports = [];
  await pool(QUICK_PORTS, 10, (port) =>
    new Promise((res) => {
      const s = net.connect({ host: ip, port, timeout: 800 });
      s.on("connect", () => {
        ports.push({ port, proto: "tcp", service: null, product: null, extra: null, title: null });
        s.destroy();
        res();
      });
      s.on("timeout", () => (s.destroy(), res()));
      s.on("error", () => res());
    }),
  );
  return { ports: ports.sort((a, b) => a.port - b.port), osHint: null, ok: true };
}

// ---------- device type guess ----------
function guessType(d) {
  const p = new Set((d.ports ?? []).map((x) => x.port));
  const v = (d.vendor ?? "").toLowerCase();
  const n = `${d.mdnsName ?? ""} ${d.hostname ?? ""}`.toLowerCase();
  const prod = (d.ports ?? []).map((x) => `${x.product ?? ""} ${x.title ?? ""} ${x.service ?? ""}`).join(" ").toLowerCase();
  if (d.isSelf) return "This Mac";
  if (d.isGateway) return "Router / gateway";
  const fw = d.firmware;
  if (fw && fw.kind !== "Web") {
    if (fw.kind === "Tuya") return "Tuya smart device";
    return `${fw.kind} device`;
  }
  if (p.has(8123) || /home assistant/.test(prod)) return "Home Assistant";
  if (/apple/.test(v) && (p.has(7000) || p.has(7100)) && !/macbook|imac|mac-?mini/.test(n)) return "Apple TV / HomePod";
  if (/lg electronics|webos|samsung|bravia/.test(`${v} ${n}`)) return "TV";
  if (/amazon/.test(v)) return "Amazon Echo / Fire";
  if (p.has(62078)) return /ipad/.test(n) ? "iPad" : "iPhone / iPad";
  if (/iphone/.test(n)) return "iPhone";
  if (/ipad/.test(n)) return "iPad";
  if (/apple-?tv|appletv/.test(n)) return "Apple TV";
  if (/macbook|imac|mac-?mini|mac-?studio/.test(n) || (p.has(5900) && /apple/.test(v))) return "Mac";
  if (/homepod/.test(n)) return "HomePod";
  if (p.has(8009) || /chromecast|google/.test(v)) return "Chromecast / Google device";
  if (p.has(9100) || p.has(631) || /printer|epson|canon|brother|hewlett|hp inc/.test(`${v} ${prod}`)) return "Printer";
  if (p.has(32400) || /plex/.test(prod)) return "Plex / media server";
  if (p.has(554) || /hikvision|dahua|reolink|camera|ipcam/.test(`${v} ${prod}`)) return "IP camera";
  if (/synology|qnap|nas/.test(`${v} ${prod} ${n}`) || (p.has(445) && p.has(5000))) return "NAS";
  if (p.has(6668)) return "Tuya smart device";
  if (p.has(6053)) return "ESPHome device";
  if (/espressif|tuya|shelly|sonoff|esphome|tasmota/.test(`${v} ${prod} ${n}`)) return "IoT (ESP / smart home)";
  if (/raspberry/.test(v)) return "Raspberry Pi";
  if (p.has(1883) || p.has(8883)) return "MQTT broker";
  if (/tp-link|ubiquiti|mikrotik|netgear|asus|zyxel|tenda|d-link|deco/.test(v) && (p.has(80) || p.has(443))) return "Network gear";
  if (p.has(3389) || p.has(445) || /windows/.test(d.osHint ?? "")) return "Windows PC";
  if (p.has(22) && /linux|openssh/.test(`${prod} ${d.osHint ?? ""}`)) return "Linux host";
  if (d.randomMac) return "Phone / laptop (private MAC)";
  return null;
}

// ---------- main ----------
async function main() {
  const startedAt = Date.now();
  setScan({ running: true, pid: process.pid, startedAt, phase: "Starting", done: 0, total: 0, error: null });
  log("scan start", ONLY_HOST ?? "full");

  const tuyaStartedAt = Date.now();
  const stopTuya = listenTuya();
  const netw = await getNetwork();
  state.network = { iface: netw.iface, cidr: netw.cidr, gateway: netw.gateway, selfIp: netw.selfIp };

  let liveIps;
  let arp;
  if (ONLY_HOST) {
    const ping = await run("ping", ["-c", "1", "-W", "700", "-q", ONLY_HOST], 3000);
    arp = await readArp(netw.iface);
    const seen = ping.ok || arp.get(ONLY_HOST)?.fresh || ONLY_HOST === netw.selfIp;
    liveIps = seen ? [ONLY_HOST] : [];
    if (!seen) for (const d of Object.values(state.devices)) if (d.ip === ONLY_HOST) d.online = false;
  } else {
    setScan({ phase: "Ping sweep", done: 0, total: netw.size - 2 });
    const replied = await pingSweep(netw);
    arp = await readArp(netw.iface);
    const inNet = (ip) => {
      const n = ip2n(ip);
      return n > netw.base && n < netw.base + netw.size - 1;
    };
    liveIps = [...new Set([...replied, ...[...arp].filter(([ip, a]) => a.fresh && inNet(ip)).map(([ip]) => ip)])];
    if (!liveIps.includes(netw.selfIp)) liveIps.push(netw.selfIp);
  }

  // mark everything offline first (full scan only)
  const now = Date.now();
  if (!ONLY_HOST) for (const d of Object.values(state.devices)) d.online = false;

  const live = [];
  for (const ip of liveIps) {
    const mac = ip === netw.selfIp ? netw.selfMac : arp.get(ip)?.mac;
    const key = mac ?? `ip:${ip}`;
    // seen earlier without a MAC (e.g. ARP not resolved yet): move that record to the MAC key
    const ipKey = `ip:${ip}`;
    if (mac && state.devices[ipKey]) {
      if (!state.devices[mac]) state.devices[mac] = { ...state.devices[ipKey], key: mac, mac };
      delete state.devices[ipKey];
      moveName(ipKey, mac);
    }
    const d = (state.devices[key] ??= { key, mac: mac ?? null, firstSeen: now });
    if (d.ip && d.ip !== ip) d.portsScannedAt = 0; // IP changed → rescan ports
    Object.assign(d, { ip, online: true, lastSeen: now, isSelf: ip === netw.selfIp, isGateway: ip === netw.gateway });
    if (mac) Object.assign(d, vendorOf(mac));
    live.push(d);
  }
  // keep IP uniqueness: an offline device that used to have a live IP keeps its old ip as "lastIp"
  setScan({ phase: "Resolving names", done: 0, total: live.length });

  await pool(live, 16, async (d) => {
    const [dnsName, mdnsName] = await Promise.all([
      netw.gateway ? reverseName(d.ip, netw.gateway) : null,
      reverseName(d.ip, "224.0.0.251", 5353),
    ]);
    if (dnsName) d.hostname = dnsName;
    if (mdnsName) d.mdnsName = mdnsName;
    d.type = guessType(d);
  });
  save();

  const toScan = live.filter((d) => FORCE_PORTS || ONLY_HOST || !d.portsScannedAt || now - d.portsScannedAt > PORT_MAX_AGE_MS);
  let done = 0;
  setScan({ phase: "Port scan", done, total: toScan.length });
  await pool(toScan, 3, async (d) => {
    d.scanningPorts = true;
    save();
    try {
      const res = hasNmap ? await nmapScan(d.ip) : await quickScan(d.ip);
      if (res.ok) {
        d.ports = res.ports;
        d.osHint = res.osHint ?? d.osHint ?? null;
        d.portsScannedAt = Date.now();
      }
    } catch (e) {
      log("port scan failed", d.ip, e?.message);
    }
    d.scanningPorts = false;
    d.type = guessType(d);
    setScan({ phase: "Port scan", done: ++done, total: toScan.length });
  });

  // firmware fingerprints (cheap HTTP GETs + Tuya broadcasts collected during the whole scan)
  setScan({ phase: "Identifying firmware", done: 0, total: live.length });
  const waitTuya = 7000 - (Date.now() - tuyaStartedAt);
  if (waitTuya > 0 && live.some((d) => /espressif|tuya/i.test(d.vendor ?? "") || d.ports?.some((x) => x.port === 6668)))
    await new Promise((r) => setTimeout(r, waitTuya));
  const tuya = stopTuya();
  let fdone = 0;
  await pool(live, 6, async (d) => {
    try {
      const t = tuya.get(d.ip);
      const fw = t ? tuyaFingerprint(t) : d.isSelf ? null : await httpFingerprint(d.ip, d.ports ?? []);
      if (fw) d.firmware = fw;
      else if (d.firmware?.kind === "Web") delete d.firmware;
    } catch (e) {
      log("fingerprint failed", d.ip, e?.message);
    }
    d.type = guessType(d);
    if (++fdone % 4 === 0) setScan({ phase: "Identifying firmware", done: fdone, total: live.length });
  });

  const finishedAt = Date.now();
  setScan({ running: false, phase: "Done", finishedAt, durationMs: finishedAt - startedAt, liveCount: live.length, pid: null });
  if (!ONLY_HOST) state.lastFullScanAt = finishedAt;
  save();
  log("scan done", `${live.length} live, ${toScan.length} port-scanned, ${Math.round((finishedAt - startedAt) / 1000)}s`);
}

main().catch((e) => {
  log("scan error", e?.stack ?? e);
  for (const d of Object.values(state.devices)) d.scanningPorts = false;
  setScan({ running: false, phase: "Error", error: String(e?.message ?? e), pid: null });
  process.exit(1);
});
