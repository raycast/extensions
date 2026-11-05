// Sampling. Two sources, both without sudo:
//  - tick (every 10 s): interface counters (truth for totals) + a one-shot per-connection nettop
//    (remote hosts, traffic class; per-app bytes only when no stream is running).
//  - stream: `nettop -P -d -s 2` in 5-minute chunks, detached. Sees every process incl. sockets that
//    closed between ticks. Its stdin must never hit EOF: with stdin=/dev/null nettop busy-loops at
//    ~1.3 cores, with an open FIFO it costs ~1.3% of one core (measured on macOS 27).
// No Raycast imports here so it can also be run from plain node for checking.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { alive, readJSON, sh, stopIfOurs, writeAtomic } from "./proc.ts";
import { NET, TUNNEL, parseStream, remoteIp, resolveLabels } from "./nettop.ts";
import { SSID_RETRY_MS, identify, parseArp, parsePort, parseSsid, startProbe } from "./network.ts";
import { CHUNK_SAMPLES, HANDOVER_MS, MANUAL_SAMPLES, clockMs, drain, running, startChunk } from "./stream.ts";
import { HOTSPOT_ID, mergeNets, normTotal, parseRows, today } from "./store.ts";
import type { Chunk, Last, NetInfo, NetKind, Sample, Triple } from "./store.ts";

export { HOTSPOT_ID, normTotal, readSamples, readState } from "./store.ts";
export type { NetInfo, NetKind, Sample, Total, Triple } from "./store.ts";
export { identify, parseArp, parsePort, parseSsid } from "./network.ts";

export type CaptureMode = "always" | "hotspot" | "manual";

const KEEP_MS = 5 * 3600 * 1000; // the longest window is 4 h
const MIN_APP_BYTES = 512;
const LOCK_STALE_MS = 60_000;
const SKEW_STEP_MS = 15 * 60_000; // time zones differ in multiples of 15 minutes
const WAKE_MS = 60_000; // a router that is missing from the ARP table gets a ping at most this often

// ---------- public entry ----------

export type Options = { capture?: string; minGapMs?: number; counts?: (net: { id: string; kind: NetKind }) => boolean };

export const modeOf = (m?: string): CaptureMode =>
  m === "hotspot" ? "hotspot" : m === "manual" || m === "off" ? "manual" : "always";

export async function sample(dir: string, opts: Options = {}): Promise<Sample | null> {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, "lock");
  const token = `${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    // a round takes seconds; a lock that old, or whose owner is gone (Raycast unloads commands), is a leftover
    if (
      Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS ||
      !alive(Number(fs.readFileSync(lock, "utf8").split(".")[0]))
    )
      fs.unlinkSync(lock);
  } catch {
    // no lock, or somebody else just took it down
  }
  try {
    fs.writeFileSync(lock, token, { flag: "wx" });
  } catch {
    return null; // another round is running
  }
  try {
    return await round(dir, opts);
  } finally {
    try {
      if (fs.readFileSync(lock, "utf8") === token) fs.unlinkSync(lock); // not the lock of a round that replaced a stale one
    } catch {
      // already removed
    }
  }
}

export function requestCapture(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "capture.req"), String(Date.now()));
}

export type Action = "reset" | "clear" | "undo";

// Processed by the next round under the lock, so it never races a tick's read-modify-write of last.json.
export function requestAction(dir: string, a: Action) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${a}.req`), String(Date.now()));
}

// True while the request file is still there: the round that applies it deletes it after writing the state.
export const actionPending = (dir: string, a: Action) => fs.existsSync(path.join(dir, `${a}.req`));

export function captureState(dir: string): { running: boolean; until: number } {
  const now = Date.now();
  const live = (readJSON<Last>(path.join(dir, "last.json"))?.chunks ?? []).filter((c) => running(c, now));
  return { running: live.length > 0, until: Math.max(0, ...live.map((c) => c.until)) };
}

async function round(dir: string, opts: Options): Promise<Sample | null> {
  const lastFile = path.join(dir, "last.json");
  const samplesFile = path.join(dir, "samples.ndjson");
  const prev = readJSON<Last>(lastFile);
  const now = Date.now();
  if (!prev && fs.existsSync(lastFile)) fs.renameSync(lastFile, `${lastFile}.bad`); // damaged: keep it, start over
  const boot = Math.round(now / 1000 - os.uptime());
  const rebooted = !!prev?.boot && Math.abs(prev.boot - boot) > 120;
  // After a reboot the old pids and sockets belong to other processes: keep counters, drop the rest.
  const last = prev?.chunks ? (rebooted ? afterReboot(prev) : prev) : null; // older state format: re-baseline once
  if (last && now - last.t < (opts.minGapMs ?? 1500)) return null;
  const n = (last?.n ?? 0) + 1;
  const mode = modeOf(opts.capture);

  const route = await sh("/sbin/route", ["-n", "get", "default"]);
  const iface = /interface:\s*(\S+)/.exec(route)?.[1] ?? "";
  const gw = /gateway:\s*(\S+)/.exec(route)?.[1] ?? "";
  if (!iface) return null;

  const checkExp = !last || n % 6 === 0 || gw !== last.gw;
  const [ns, exp, arp, ports] = await Promise.all([
    sh("/usr/sbin/netstat", ["-ib", "-I", iface]),
    checkExp ? sh(NET, ["-P", "-L", "1", "-x", "-t", "expensive", "-J", "bytes_in,bytes_out"]) : "",
    gw ? sh("/usr/sbin/arp", ["-an"]) : "",
    !last?.port || last.port.iface !== iface || n % 30 === 0
      ? sh("/usr/sbin/networksetup", ["-listallhardwareports"])
      : "",
  ]);

  const linkRow = ns.split("\n").find((l) => l.includes("<Link#"));
  const tok = linkRow?.trim().split(/\s+/) ?? [];
  const ifc: [number, number] = [Number(tok[tok.length - 5]) || 0, Number(tok[tok.length - 2]) || 0];
  const expensive = checkExp ? exp.trim().split("\n").length > 1 : !!last?.exp;
  const port = ports ? parsePort(ports, iface) : last?.port?.iface === iface ? last.port.name : "";
  const ident = identify({ gw, port, expensive });
  const hs = ident.kind === "hotspot";
  // The router's MAC only tells two networks with the same address apart (a hotspot never needs it).
  // The ARP entry can be missing when the router has been idle: a ping brings it back. That costs at most 1 s,
  // so it runs for a new router, otherwise at most once a minute.
  let mac: string | null = null;
  let wake = last?.wake;
  if (!hs && gw) {
    mac = parseArp(arp, gw);
    if (!mac) {
      const same = last?.gw === gw && last.port?.iface === iface;
      if (!same || now - (wake ?? 0) > WAKE_MS) {
        wake = now;
        await sh("/sbin/ping", ["-c", "1", "-t", "1", gw], 2500);
        mac = parseArp(await sh("/usr/sbin/arp", ["-an"]), gw);
      }
      mac ??= same ? (last?.mac ?? null) : null;
    }
  }

  const nets: Record<string, NetInfo> = { ...(prev?.nets ?? {}) };
  if (mac && ident.id.startsWith("ip:")) {
    const known = nets[ident.id];
    if (known?.mac && known.mac !== mac) ident.id = `${ident.id}#${mac}`; // another router behind the same address
  }
  const cur = (nets[ident.id] ??= { ...ident, seen: now });
  if (mac && ident.id.startsWith("ip:")) cur.mac ??= mac;
  cur.kind = ident.kind;
  cur.seen = now;
  cur.label = cur.ssid && cur.kind === "wifi" ? cur.ssid : ident.label;
  let probe = last?.probe;
  if (probe && (!alive(probe.pid) || now > probe.start + 45_000)) {
    await stopIfOurs(probe.pid, "/usr/sbin/system_profiler");
    let txt = "";
    try {
      txt = fs.readFileSync(probe.file, "utf8");
    } catch {
      // no output: treated as unreadable
    }
    fs.rmSync(probe.file, { force: true });
    const asked = nets[probe.id];
    if (asked && probe.id === ident.id) {
      asked.ssid = parseSsid(txt); // null = unreadable from this process (macOS hides it without Location permission)
      asked.tried = now;
      if (asked.ssid) asked.label = asked.ssid;
    } // switched networks while it ran: the answer is ambiguous, ask again later
    probe = undefined;
  }
  if (
    !probe &&
    last &&
    cur.kind === "wifi" &&
    (cur.ssid === undefined || (cur.ssid === null && now - (cur.tried ?? 0) > SSID_RETRY_MS))
  )
    probe = startProbe(dir, now, ident.id);

  const pids: Last["pids"] = {};
  for (const [k, v] of Object.entries(last?.pids ?? prev?.pids ?? {})) if (v.s && now - v.s < 15 * 60_000) pids[k] = v;
  const paths: Last["paths"] = { ...(prev?.paths ?? {}) };

  const reqFile = path.join(dir, "capture.req");
  const manual = fs.existsSync(reqFile);
  const counted = opts.counts ? opts.counts({ id: ident.id, kind: ident.kind }) : true; // no stream while this network is not counted
  const want = counted && (mode === "always" || (mode === "hotspot" && hs));

  // ---- stream: ingest finished samples of every chunk (per pid first, labels only for pids that matter)
  const streaming = !!last?.chunks.some((c) => running(c, now));
  let covered = last?.covered ?? 0;
  const chunks: Chunk[] = [];
  const byPid = new Map<number, { name: string; v: Triple }>();
  let streamDt = 0;
  for (const c of [...(last?.chunks ?? [])].sort((a, b) => a.start - b.start)) {
    // an automatic chunk nobody wants any more (setting changed, left a counted network) is stopped; a requested capture runs out
    const ended = !running(c, now) || (!want && !c.manual);
    // past its end or unwanted but still there (e.g. the Mac slept through it): stop it, but only if the pid is still ours
    if (ended) await stopIfOurs(c.pid, NET);
    for (const rows of drain(c, ended)) {
      const stamp = rows.find((r) => r.time)?.time;
      if (!stamp) continue; // a sample without rows carries no timestamp
      let t = clockMs(stamp, c.start);
      // the first sample is printed within seconds of the start: a bigger gap is a time zone change
      c.skew ??= Math.round((t - c.start) / SKEW_STEP_MS) * SKEW_STEP_MS;
      t -= c.skew;
      if (c.prevT === undefined) {
        c.prevT = t; // first sample is cumulative since socket open: baseline only
        continue;
      }
      const from = Math.max(c.prevT, covered); // overlapping chunks: count each moment once
      const span = t - c.prevT;
      c.prevT = t;
      if (span <= 0 || t <= from) continue;
      const frac = (t - from) / span;
      for (const r of rows) {
        if (r.conn || r.v[0] + r.v[1] === 0) continue;
        const e = byPid.get(r.pid) ?? { name: r.name, v: [0, 0, 0] as Triple };
        e.v[0] += r.v[0] * frac;
        e.v[1] += r.v[1] * frac;
        e.v[2] += r.v[2] * frac;
        byPid.set(r.pid, e);
      }
      streamDt += t - from;
      covered = t;
    }
    if (ended) fs.rmSync(c.file, { force: true });
    else chunks.push(c);
  }
  const heavy = [...byPid.entries()].filter(([, e]) => e.v[0] + e.v[1] >= MIN_APP_BYTES); // crumbs stay unattributed
  await resolveLabels(
    heavy.map(([pid, e]) => [pid, e.name]),
    pids,
    paths,
    now,
  );
  const streamApps: Record<string, Triple> = {};
  for (const [pid, e] of heavy) {
    const a = (streamApps[pids[pid]?.label ?? e.name] ??= [0, 0, 0]);
    for (let i = 0; i < 3; i++) a[i] += Math.round(e.v[i]);
  }

  // ---- tick snapshot: hosts + traffic class; per-app bytes only when no stream covered the interval.
  // With a stream it is restricted to the heaviest pids (-p): ~10 ms instead of ~120 ms for every socket.
  const hot = byPid.size
    ? [...byPid.entries()]
        .sort((x, y) => y[1].v[0] + y[1].v[1] - (x[1].v[0] + x[1].v[1]))
        .slice(0, 8)
        .map(([pid]) => pid)
    : (last?.hot ?? []);
  // Every 6th tick the snapshot covers all sockets to find VPN-tunnel users; in between only hot + VPN pids.
  const fullSnap = !last || !streaming || n % 6 === 0;
  const snap = fullSnap || (n % 3 === 0 && hot.length > 0);
  const streamCovers = last?.streamSince !== undefined && last.streamSince <= last.t;
  const apps: Sample["apps"] = {};
  const hosts: Sample["hosts"] = {};
  const best: Record<string, [number, string]> = {};
  const tun: Record<string, [number, number]> = {};
  let conns = last?.conns ?? {};
  let connsT = last?.connsT ?? now;
  let connPids = last?.connPids ?? null;
  let vpnPids = last?.vpnPids ?? [];
  if (snap) {
    const sel = fullSnap ? [] : [...new Set([...hot, ...vpnPids])].slice(0, 24);
    const only = sel.flatMap((p) => ["-p", String(p)]);
    const nt = await sh(NET, [
      "-L",
      "1",
      "-n",
      "-x",
      "-t",
      "external",
      ...only,
      "-J",
      "interface,bytes_in,bytes_out,re-tx,tc_class",
    ]);
    const rows = (parseStream(nt)[0] ?? []).filter((r) => r.conn && (r.iface === iface || TUNNEL.test(r.iface)));
    await resolveLabels(
      rows.map((c) => [c.pid, c.name]),
      pids,
      paths,
      now,
    );
    const attribute = !!last && last.connsT === last.t && connPids === null && !streamCovers; // full diff spanning exactly this tick
    const seen = connPids ? new Set(connPids) : null; // pids the previous (filtered) snapshot covered
    const cur: Last["conns"] = {};
    for (const c of rows) {
      const key = `${c.pid}|${c.conn}`;
      cur[key] = c.v;
      if (!last || (seen && !seen.has(c.pid))) continue; // no baseline for this pid yet
      const p = conns[key];
      const d = (p ? c.v.map((v, i) => (v >= p[i] ? v - p[i] : v)) : c.v) as Triple;
      if (d[0] + d[1] === 0 && d[2] === 0) continue;
      const label = pids[c.pid].label;
      const tunnel = c.iface !== iface;
      if (tunnel && streamCovers) {
        const t = (tun[label] ??= [0, 0]);
        t[0] += d[0];
        t[1] += d[1];
      }
      if (attribute && !tunnel) {
        const a = (apps[label] ??= [0, 0, 0]);
        a[0] += d[0];
        a[1] += d[1];
        a[2] += d[2];
      }
      const ip = remoteIp(c.conn!);
      if (ip) {
        const h = (hosts[label] ??= {});
        h[ip] = (h[ip] ?? 0) + d[0] + d[1];
      }
      if (c.tc && (!best[label] || d[0] + d[1] > best[label][0])) best[label] = [d[0] + d[1], c.tc];
    }
    conns = cur;
    connsT = now;
    connPids = fullSnap ? null : sel;
    if (fullSnap) vpnPids = [...new Set(rows.filter((r) => r.iface !== iface).map((r) => r.pid))];
  }
  const tc = trim(apps, hosts, best);

  // only the current interface keeps a baseline: after a switch (Wi-Fi → tethering → Wi-Fi) the old counter is stale
  // a failed netstat read (timeout, no counter row) is no reading: zeros would make the next tick book the whole counter
  const pi = linkRow ? (last?.ifc[iface] ?? (rebooted ? [0, 0] : undefined)) : undefined; // counters restart at boot: count since boot
  const inB = pi ? (ifc[0] >= pi[0] ? ifc[0] - pi[0] : ifc[0]) : 0;
  const outB = pi ? (ifc[1] >= pi[1] ? ifc[1] - pi[1] : ifc[1]) : 0;

  // ---- total since reset, and the reset / clear / undo actions
  let hsDay = prev?.hsDay?.d === today() ? prev.hsDay : { d: today(), b: 0 };
  let total = normTotal(prev?.total, now);
  let undo = prev?.undo ? { ...prev.undo, total: normTotal(prev.undo.total, now) } : undefined;
  const backup = path.join(dir, "samples.cleared.ndjson");
  // Raycast unloads the command right after a menu click, which can cut a round short: a request is
  // only deleted after last.json is written, so a cut round is simply redone by the next tick.
  const taken: string[] = [];
  const take = (a: Action) => {
    const f = path.join(dir, `${a}.req`);
    const has = fs.existsSync(f);
    if (has) taken.push(f);
    return has;
  };
  if (take("undo") && undo) {
    const u = undo;
    total = { since: u.total.since, nets: mergeNets(u.total.nets, total.nets) };
    if (u.samples && u.hsDay.d === hsDay.d) hsDay = { d: hsDay.d, b: hsDay.b + u.hsDay.b }; // only a clear zeroes it
    if (u.samples && fs.existsSync(backup)) {
      let cur = "";
      try {
        cur = fs.readFileSync(samplesFile, "utf8");
      } catch {
        // no samples file yet
      }
      writeAtomic(samplesFile, fs.readFileSync(backup, "utf8") + cur);
      fs.rmSync(backup, { force: true });
    }
    undo = undefined;
  }
  const clear = take("clear");
  if (take("reset") || clear) {
    undo = { at: now, total, hsDay: { ...hsDay }, samples: clear };
    total = { since: now, nets: {} };
    if (clear) {
      try {
        fs.renameSync(samplesFile, backup);
      } catch {
        // nothing to move
      }
      hsDay = { d: today(), b: 0 };
    }
  }

  // The interval since the last round belongs to the network that round saw: after a switch (or a night of sleep)
  // it is not hotspot data just because the Mac woke up on a hotspot. The rows below use the same owner.
  const owner = last?.net && last.net !== ident.id ? last.net : ident.id;
  const ownerHs = owner === HOTSPOT_ID;
  if (last) {
    const t = (total.nets[owner] ??= [0, 0]);
    t[0] += inB;
    t[1] += outB;
    if (ownerHs) hsDay.b += inB + outB;
  }

  const newest = chunks[chunks.length - 1];
  let startedCold = false;
  if (last && (want ? !newest || now > newest.until - HANDOVER_MS : manual && !newest)) {
    try {
      chunks.push(await startChunk(dir, now, want ? CHUNK_SAMPLES : MANUAL_SAMPLES, !want));
      startedCold = !newest;
    } catch {
      // could not start: retry next tick
    }
  }
  if (manual) taken.push(reqFile);
  const streamSince = chunks.length === 0 ? undefined : startedCold || !streaming ? now : (last?.streamSince ?? now);

  const next: Last = {
    t: now,
    n,
    pruned: last?.pruned ?? now,
    ifc: linkRow ? { [iface]: ifc } : last?.ifc[iface] ? { [iface]: last.ifc[iface] } : {},
    conns,
    connsT,
    connPids,
    hot,
    vpnPids,
    pids,
    paths,
    gw,
    wake,
    net: ident.id,
    nets,
    exp: expensive,
    mac,
    port: { iface, name: port },
    probe,
    chunks,
    covered,
    streamSince,
    hsDay,
    boot,
    total,
    undo,
  };

  const lines: Sample[] = [];
  let out: Sample | null = null;
  if (last) {
    if (streamDt > 0)
      lines.push({
        t: covered,
        dt: Math.round(streamDt),
        iface,
        gw,
        hs: ownerHs,
        inB: 0,
        outB: 0,
        apps: streamApps,
        hosts: {},
        tc: {},
        net: owner,
        cap: 1,
      });
    out = {
      t: now,
      dt: now - last.t,
      iface,
      gw,
      hs: ownerHs,
      inB,
      outB,
      apps,
      hosts,
      tc,
      net: owner,
      ...(Object.keys(tun).length ? { tun } : {}),
    };
    lines.push(out);
  }
  const prune = now - next.pruned > 3600 * 1000;
  if (prune) next.pruned = now;

  // The state goes first: a round cut short after this loses its rows (one interval) instead of adding them twice.
  writeAtomic(lastFile, JSON.stringify(next));
  for (const f of taken) fs.rmSync(f, { force: true });
  if (lines.length) fs.appendFileSync(samplesFile, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  if (prune) housekeeping(dir, now, next);
  return out;
}

// Hourly: drop samples older than KEEP_MS, and leftovers of rounds that were cut short.
function housekeeping(dir: string, now: number, state: Last) {
  const samplesFile = path.join(dir, "samples.ndjson");
  try {
    const keep = parseRows(fs.readFileSync(samplesFile, "utf8").split("\n")).filter((s) => now - s.t < KEEP_MS);
    writeAtomic(samplesFile, keep.map((s) => JSON.stringify(s)).join("\n") + "\n");
  } catch {
    // pruning is best effort
  }
  try {
    const tracked = new Set([...state.chunks.map((c) => c.file), ...(state.probe ? [state.probe.file] : [])]);
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (tracked.has(full) || now - fs.statSync(full).mtimeMs < 3600 * 1000) continue;
      if (/^(stream|ssid)-\d+\.(csv|txt)$|\.tmp$/.test(f)) fs.rmSync(full, { force: true });
      else if (f === "samples.cleared.ndjson" && !state.undo?.samples) fs.rmSync(full, { force: true }); // nothing can undo into it
    }
  } catch {
    // best effort
  }
}

function afterReboot(prev: Last): Last {
  return {
    ...prev,
    chunks: [],
    conns: {},
    connsT: -1,
    connPids: null,
    hot: [],
    vpnPids: [],
    pids: {},
    covered: 0,
    streamSince: undefined,
    ifc: {},
    probe: undefined,
  };
}

// drop crumbs (their bytes fall into "unattributed"), top 3 hosts per app, dominant traffic class
function trim(apps: Sample["apps"], hosts: Sample["hosts"], best: Record<string, [number, string]>): Sample["tc"] {
  for (const l of Object.keys(apps)) if (apps[l][0] + apps[l][1] < MIN_APP_BYTES) delete apps[l];
  for (const l of Object.keys(hosts)) {
    const e = Object.entries(hosts[l]).sort((a, b) => b[1] - a[1]);
    if (e.reduce((s, x) => s + x[1], 0) < MIN_APP_BYTES) delete hosts[l];
    else hosts[l] = Object.fromEntries(e.slice(0, 3));
  }
  const tc: Sample["tc"] = {};
  for (const l of Object.keys(best)) if (apps[l] || hosts[l]) tc[l] = best[l][1];
  return tc;
}
