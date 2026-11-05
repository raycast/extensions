// Pure functions over stored samples: window totals, per-app breakdown, minute buckets, spikes.
import { HOTSPOT_ID } from "./sample.ts";
import type { Sample, Total } from "./sample.ts";

export const MIN = 60000;
export const WINDOWS = [15, 60, 120, 240] as const;
export const winLabel = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

export function fmt(n: number): string {
  if (n < 1e3) return `${Math.round(n)}B`;
  const [v, u] = n < 1e6 ? [n / 1e3, "K"] : n < 1e9 ? [n / 1e6, "M"] : [n / 1e9, "G"];
  return `${v >= 100 || u === "K" ? Math.round(v) : v.toFixed(1)}${u}`;
}

export const bytes2 = (i: number, o: number) => `↓ ${fmt(i)}  ↑ ${fmt(o)}`;
export const bytes3 = (i: number, o: number) => `${bytes2(i, o)}  = ${fmt(i + o)}`;

export const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

// ---------- which networks count ----------

export type CountOn = "all" | "hotspot" | "selected";
export type Filter = { mode: CountOn; picked: ReadonlySet<string>; typed?: boolean }; // typed: Wi-Fi names were entered, so an empty match means "nothing", not "everything"

export const COUNTING: Record<CountOn, string> = {
  all: "all networks",
  hotspot: "personal hotspot only",
  selected: "selected networks",
};

export const countOn = (v?: string): CountOn => (v === "hotspot" || v === "selected" ? v : "all");

// rows from before networks were tracked have no id: the hotspot flag is all they know
export const netOf = (s: Sample) => s.net ?? (s.hs ? HOTSPOT_ID : "unknown");

export function counts(f: Filter, id: string): boolean {
  if (f.mode === "hotspot") return id === HOTSPOT_ID;
  if (f.mode === "selected") return (f.picked.size === 0 && !f.typed) || f.picked.has(id); // nothing picked or typed yet: count everything
  return true;
}

// Ticked networks plus every network whose Wi-Fi name is in the comma-separated list (case-insensitive).
export function pickedIds(
  picked: ReadonlySet<string>,
  names: string | undefined,
  nets: Record<string, { ssid?: string | null }>,
): Set<string> {
  const out = new Set(picked);
  const want = new Set(
    (names ?? "")
      .split(",")
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  );
  if (want.size) for (const [id, n] of Object.entries(nets)) if (n.ssid && want.has(n.ssid.toLowerCase())) out.add(id);
  return out;
}

export const filterSamples = (xs: Sample[], f: Filter) =>
  f.mode === "all" ? xs : xs.filter((s) => counts(f, netOf(s)));

export function sumTotal(t: Total | null, f: Filter): [number, number] {
  let i = 0;
  let o = 0;
  for (const [id, v] of Object.entries(t?.nets ?? {})) {
    if (!counts(f, id)) continue;
    i += v[0];
    o += v[1];
  }
  return [i, o];
}

export function hostLabel(ip: string): string {
  if (ip.startsWith("17.")) return `${ip} (Apple)`;
  const m = /^100\.(\d+)\./.exec(ip);
  return m && +m[1] >= 64 && +m[1] <= 127 ? `${ip} (Tailscale)` : ip;
}

const REVERSE_DNS = /^(com|io|org|net|app|dev|me|co)\.([a-z0-9-]+)\.(.+)$/i;

// Readable name for a stored label; the stored label itself (and with it the history) stays as it is.
export function displayName(label: string): string {
  const m = REVERSE_DNS.exec(label);
  let out = label;
  if (m) {
    const vendor = m[2].toLowerCase();
    out = vendor === "apple" ? m[3].split(".").join(" ") : vendor.charAt(0).toUpperCase() + vendor.slice(1); // "io.tailscale.ipn.macsys.network-extension" is just Tailscale
  }
  return out.replace(/[0-9a-f]{8}(?:-?[0-9a-f]){8,}/gi, (h) => `${h.slice(0, 8)}…`);
}

export type AppAgg = {
  label: string;
  inB: number;
  outB: number;
  retx: number;
  tunIn: number;
  tunOut: number;
  hosts: Record<string, number>;
  tc: Record<string, number>;
};
export type Spike = { start: number; end: number; bytes: number; app: string };
export type Agg = {
  inB: number;
  outB: number;
  attIn: number;
  attOut: number;
  apps: AppAgg[]; // sorted by traffic
};

export function aggregate(samples: Sample[]): Agg {
  const map = new Map<string, AppAgg>();
  let inB = 0,
    outB = 0,
    attIn = 0,
    attOut = 0;
  for (const s of samples) {
    inB += s.inB;
    outB += s.outB;
    const get = (label: string) => {
      const a = map.get(label) ?? { label, inB: 0, outB: 0, retx: 0, tunIn: 0, tunOut: 0, hosts: {}, tc: {} };
      map.set(label, a);
      return a;
    };
    for (const [label, [i, o, r]] of Object.entries(s.apps)) {
      const a = get(label);
      a.inB += i;
      a.outB += o;
      a.retx += r;
    }
    for (const [label, [i, o]] of Object.entries(s.tun ?? {})) {
      const a = get(label);
      a.tunIn += i;
      a.tunOut += o;
    }
    // hosts and traffic class come from tick snapshots, also when the stream owns the per-app bytes
    for (const [label, h] of Object.entries(s.hosts)) {
      const a = get(label);
      let b = 0;
      for (const [ip, v] of Object.entries(h)) {
        a.hosts[ip] = (a.hosts[ip] ?? 0) + v;
        b += v;
      }
      if (s.tc[label]) a.tc[s.tc[label]] = (a.tc[s.tc[label]] ?? 0) + b;
    }
  }
  // Tunnel bytes were counted twice by the stream (app + the VPN client carrying them): keep them on the VPN client.
  for (const a of map.values()) {
    a.inB = Math.max(0, a.inB - a.tunIn);
    a.outB = Math.max(0, a.outB - a.tunOut);
    attIn += a.inB;
    attOut += a.outB;
  }
  const apps = [...map.values()]
    .filter((a) => a.inB + a.outB + a.tunIn + a.tunOut > 0)
    .sort((a, b) => b.inB + b.outB - (a.inB + a.outB));
  return {
    inB,
    outB,
    attIn: Math.min(attIn, inB),
    attOut: Math.min(attOut, outB),
    apps,
  };
}

// What the interface moved that no app got the blame for.
export const unattr = (a: Agg): [number, number] => [Math.max(0, a.inB - a.attIn), Math.max(0, a.outB - a.attOut)];

const UNATTR = "unattributed";

// Minute buckets of total traffic; ignores samples that cover a long gap (sleep) when looking for spikes.
export function spikes(samples: Sample[], thresholdBytes: number): Spike[] {
  const buckets = new Map<number, { bytes: number; apps: Map<string, number> }>();
  for (const s of samples) {
    if (s.dt > 2 * MIN) continue;
    const k = Math.floor(s.t / MIN);
    const b = buckets.get(k) ?? { bytes: 0, apps: new Map() };
    b.bytes += s.inB + s.outB;
    for (const [l, v] of Object.entries(s.apps)) b.apps.set(l, (b.apps.get(l) ?? 0) + v[0] + v[1]);
    for (const [l, v] of Object.entries(s.tun ?? {})) b.apps.set(l, (b.apps.get(l) ?? 0) - v[0] - v[1]); // may dip below 0 until the stream row of the same traffic (another minute) is merged
    buckets.set(k, b);
  }
  for (const b of buckets.values()) {
    const att = [...b.apps.values()].reduce((n, v) => n + Math.max(0, v), 0);
    if (b.bytes > att) b.apps.set(UNATTR, b.bytes - att);
  }
  // a spike is a minute well above both the threshold and the window's usual minute
  const sorted = [...buckets.values()]
    .map((b) => b.bytes)
    .filter((n) => n > 0) // minutes that only hold stream rows say nothing about the usual minute
    .sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  thresholdBytes = Math.max(thresholdBytes, 3 * median);
  const out: Spike[] = [];
  let cur: (Spike & { apps: Map<string, number>; last: number }) | null = null;
  for (const k of [...buckets.keys()].sort((a, b) => a - b)) {
    const b = buckets.get(k)!;
    if (b.bytes < thresholdBytes) continue;
    if (cur && k - cur.last <= 1) {
      cur.bytes += b.bytes;
      cur.end = (k + 1) * MIN;
      cur.last = k;
      for (const [l, v] of b.apps) cur.apps.set(l, (cur.apps.get(l) ?? 0) + v);
    } else {
      if (cur) out.push(done(cur));
      cur = { start: k * MIN, end: (k + 1) * MIN, bytes: b.bytes, app: "", apps: new Map(b.apps), last: k };
    }
  }
  if (cur) out.push(done(cur));
  return out;
}

function done(c: Spike & { apps: Map<string, number> }): Spike {
  const top = [...c.apps.entries()].sort((a, b) => b[1] - a[1])[0];
  return { start: c.start, end: c.end, bytes: c.bytes, app: top && top[1] > 0 ? top[0] : UNATTR };
}

// Bytes per time slice across the window as [download, upload]; null where no sample exists (Mac asleep / not sampled).
// A pick may go negative in one slice when the bytes it subtracts were recorded in the neighbouring row;
// that debt is settled against nearby slices before clamping at zero.
export function buckets(
  samples: Sample[],
  now: number,
  windowMin: number,
  n: number,
  pick: (s: Sample) => [number, number],
): ([number, number] | null)[] {
  const step = (windowMin * MIN) / n;
  const out: ([number, number] | null)[] = Array(n).fill(null);
  for (const s of samples) {
    const i = Math.floor((s.t - (now - windowMin * MIN)) / step);
    if (i < 0 || i >= n) continue;
    const [a, b] = pick(s);
    const cur = out[i] ?? [0, 0];
    out[i] = [cur[0] + a, cur[1] + b];
  }
  for (const c of [0, 1])
    for (let i = 0; i < n; i++) {
      const d = out[i];
      if (!d || d[c] >= 0) continue;
      let debt = -d[c];
      d[c] = 0;
      for (let k = 1; debt > 0 && k < n; k++)
        for (const j of [i - k, i + k]) {
          const e = out[j];
          if (debt <= 0 || !e || e[c] <= 0) continue;
          const take = Math.min(e[c], debt);
          e[c] -= take;
          debt -= take;
        }
    }
  return out;
}

// One app's bytes in a row: what the stream saw minus what went through a VPN tunnel (the VPN client carries those).
export const appPick =
  (label: string) =>
  (s: Sample): [number, number] => [
    (s.apps[label]?.[0] ?? 0) - (s.tun?.[label]?.[0] ?? 0),
    (s.apps[label]?.[1] ?? 0) - (s.tun?.[label]?.[1] ?? 0),
  ];

// Interface bytes minus the bytes pinned on apps (net of tunnels). Tick rows carry the interface bytes and
// stream rows the app bytes, so only a bucket sum means something.
export function unattrPick(s: Sample): [number, number] {
  let ai = 0;
  let ao = 0;
  for (const v of Object.values(s.apps)) {
    ai += v[0];
    ao += v[1];
  }
  for (const v of Object.values(s.tun ?? {})) {
    ai -= v[0];
    ao -= v[1];
  }
  return [s.inB - ai, s.outB - ao];
}

const BLOCKS = "▁▂▃▄▅▆▇█";

// 12 blocks across the window; "·" where no sample exists.
export function sparkline(samples: Sample[], now: number, windowMin: number, n = 12): string {
  const vals = buckets(samples, now, windowMin, n, (s) => [s.inB + s.outB, 0]);
  const max = Math.max(1, ...vals.map((v) => v?.[0] ?? 0));
  return vals.map((v) => (v === null ? "·" : BLOCKS[Math.min(7, Math.floor((v[0] / max) * 7.999))])).join("");
}

export function lastRate(samples: Sample[]): { inBps: number; outBps: number } | null {
  const s = [...samples].reverse().find((x) => !x.cap);
  if (!s || s.dt <= 0) return null;
  return { inBps: (s.inB * 1000) / s.dt, outBps: (s.outB * 1000) / s.dt };
}
