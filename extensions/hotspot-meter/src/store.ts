// What is stored on disk (samples.ndjson, last.json) and the readers for it.
import fs from "node:fs";
import path from "node:path";
import { readJSON } from "./proc.ts";

export type Triple = [number, number, number]; // in, out, retransmitted bytes

export type Sample = {
  t: number; // ms epoch
  dt: number; // ms since previous sample
  iface: string;
  gw: string;
  hs: boolean; // hotspot / expensive link
  inB: number; // interface delta (all traffic on the default interface); 0 on stream rows
  outB: number;
  apps: Record<string, Triple>;
  hosts: Record<string, Record<string, number>>; // app -> remote ip -> bytes
  tc: Record<string, string>; // app -> traffic class of its biggest connection
  net?: string; // network id the row was recorded on (see identify)
  tun?: Record<string, [number, number]>; // app -> bytes through a VPN tunnel (the stream counted them on top of the VPN client's own bytes)
  cap?: 1; // row comes from the stream (attribution only)
};

export type NetKind = "hotspot" | "wifi" | "wired" | "other";
export type NetInfo = {
  id: string;
  kind: NetKind;
  label: string;
  mac?: string;
  ssid?: string | null;
  tried?: number;
  seen: number;
};
export const HOTSPOT_ID = "hotspot";

// Usage since the user last reset it, per network; exact (interface counters), survives reboots.
export type Total = { since: number; nets: Record<string, [number, number]> };
export type Undo = { at: number; total: Total; hsDay: { d: string; b: number }; samples: boolean };
export type Probe = { id: string; pid: number; start: number; file: string }; // detached SSID lookup

// One running nettop chunk. offset = byte offset of the first unread sample header in its file.
export type Chunk = {
  pid: number;
  start: number;
  until: number;
  file: string;
  offset: number;
  prevT?: number;
  manual?: true; // started by a capture request, not by the Per-App Breakdown setting
  skew?: number; // clock offset between nettop's timestamps and ours (time zone changed while it ran)
};

export type Last = {
  t: number;
  n: number; // tick counter
  pruned: number;
  ifc: Record<string, [number, number]>;
  conns: Record<string, Triple>; // last per-connection snapshot …
  connsT: number; // … and when it was taken
  connPids: number[] | null; // pids that snapshot was restricted to (null = all sockets)
  hot: number[]; // heaviest stream pids, used to restrict the next snapshot
  vpnPids: number[]; // pids with sockets on a tunnel interface (found by the full snapshot every 6th tick)
  pids: Record<string, { n: string; label: string; s: number }>; // pid -> label, s = last seen
  paths: Record<string, string>; // app label -> .app path (for icons)
  gw: string;
  wake?: number; // when the router last got a ping to bring its ARP entry back
  chunks: Chunk[];
  covered: number; // stream data is ingested up to this time
  streamSince?: number; // continuous stream coverage starts here (undefined: no stream)
  hsDay?: { d: string; b: number }; // bytes used on a hotspot / expensive link today
  net?: string; // current network id
  nets?: Record<string, NetInfo>;
  exp?: boolean; // last `nettop -t expensive` result
  mac?: string | null; // default gateway's MAC (identifies the network without Location permission)
  port?: { iface: string; name: string }; // hardware port of the default interface ("Wi-Fi", "iPhone USB" …)
  probe?: Probe;
  boot?: number; // boot time (s); a change means every pid and socket above is stale
  total?: Total;
  undo?: Undo; // state before the last reset / clear
};

export const today = () => new Date().toLocaleDateString("sv-SE");

// Old state stored one in/out pair; per-network totals keep it under "unknown" (and the hotspot part under "hotspot").
export function normTotal(raw: unknown, now: number): Total {
  const t = raw as
    | { since?: number; nets?: Total["nets"]; in?: number; out?: number; hsIn?: number; hsOut?: number }
    | null
    | undefined;
  if (t?.nets) return { since: t.since ?? now, nets: t.nets };
  if (t && typeof t.in === "number") {
    const hs: [number, number] = [t.hsIn ?? 0, t.hsOut ?? 0];
    return {
      since: t.since ?? now,
      nets: { ...(hs[0] + hs[1] > 0 ? { [HOTSPOT_ID]: hs } : {}), unknown: [t.in - hs[0], (t.out ?? 0) - hs[1]] },
    };
  }
  return { since: now, nets: {} };
}

export function mergeNets(a: Total["nets"], b: Total["nets"]): Total["nets"] {
  const out: Total["nets"] = { ...a };
  for (const [id, v] of Object.entries(b)) out[id] = [(out[id]?.[0] ?? 0) + v[0], (out[id]?.[1] ?? 0) + v[1]];
  return out;
}

// ---------- readers for the UI ----------

// One damaged line (a write cut short by a crash or power loss) must not hide the rest of the history.
export function parseRows(lines: string[]): Sample[] {
  const rows: Sample[] = [];
  for (const l of lines) {
    if (!l) continue;
    try {
      const s = JSON.parse(l) as Sample;
      if (typeof s.t === "number") rows.push(s);
    } catch {
      // skipped
    }
  }
  return rows;
}

// Reads only the tail of the file that can contain rows newer than sinceMs (rows are appended in time order,
// give or take a few seconds), so a 15-minute title costs a fraction of parsing 4 hours.
export function readSamples(dir: string, sinceMs: number): Sample[] {
  let fd: number;
  try {
    fd = fs.openSync(path.join(dir, "samples.ndjson"), "r");
  } catch {
    return [];
  }
  try {
    const size = fs.fstatSync(fd).size;
    let take = Math.min(size, 256 * 1024);
    for (;;) {
      const buf = Buffer.alloc(take);
      fs.readSync(fd, buf, 0, take, size - take);
      const lines = buf.toString("utf8").split("\n");
      if (take < size) lines.shift(); // first line is partial
      const rows = parseRows(lines);
      if (take === size || (rows.length && rows[0].t < sinceMs - 60_000)) {
        return rows.filter((s) => s.t >= sinceMs).sort((a, b) => a.t - b.t);
      }
      take = Math.min(size, take * 4);
    }
  } catch {
    return [];
  } finally {
    fs.closeSync(fd);
  }
}

export function readState(dir: string): {
  hsToday: number;
  paths: Record<string, string>;
  total: Total | null;
  undoAt: number;
  nets: Record<string, NetInfo>;
  net: string;
} {
  const l = readJSON<Last>(path.join(dir, "last.json"));
  return {
    hsToday: l?.hsDay && l.hsDay.d === today() ? l.hsDay.b : 0,
    paths: l?.paths ?? {},
    total: l?.total ? normTotal(l.total, 0) : null,
    undoAt: l?.undo?.at ?? 0,
    nets: l?.nets ?? {},
    net: l?.net ?? "",
  };
}
