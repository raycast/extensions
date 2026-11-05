// nettop output: parsing, and mapping pids to app labels.
import path from "node:path";
import { sh } from "./proc.ts";
import type { Last, Triple } from "./store.ts";

export const NET = "/usr/bin/nettop";
export const TUNNEL = /^(utun|ipsec|ppp)\d/; // nettop's -t wifi also matches VPN tunnels that ride on Wi-Fi

// ---------- nettop parsing ----------

export type Row = { name: string; pid: number; conn?: string; iface: string; v: Triple; tc: string; time?: string };

// One nettop sample (header line + rows). Process rows have no conn; connection rows follow their process.
export function parseBlock(lines: string[]): Row[] {
  const h = lines[0].split(",");
  const ix = (n: string) => h.indexOf(n);
  const [iT, iIf, iIn, iOut, iRe, iTc] = [
    ix("time"),
    ix("interface"),
    ix("bytes_in"),
    ix("bytes_out"),
    ix("re-tx"),
    ix("tc_class"),
  ];
  const nameCol = iT >= 0 ? 1 : 0;
  const rows: Row[] = [];
  let proc: { pid: number; name: string } | null = null;
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const f = line.split(",");
    const first = f[nameCol];
    const v: Triple = [Number(f[iIn]) || 0, Number(f[iOut]) || 0, Number(f[iRe]) || 0];
    const time = iT >= 0 ? f[iT] : undefined;
    if (/^(tcp|udp|quic)\d* /.test(first)) {
      if (proc) rows.push({ ...proc, conn: first, iface: f[iIf] ?? "", v, tc: f[iTc] ?? "", time });
    } else {
      // "Name With Spaces.1234" — split on the LAST dot; names like "2.1.307.2512" exist
      const m = /^(.*)\.(\d+)$/.exec(first);
      proc = m ? { name: m[1], pid: Number(m[2]) } : null;
      if (proc) rows.push({ ...proc, iface: "", v, tc: "", time });
    }
  }
  return rows;
}

export function parseStream(text: string): Row[][] {
  const blocks: string[][] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("time,") || line.startsWith(","))
      blocks.push([line]); // header line starts a sample
    else if (blocks.length) blocks[blocks.length - 1].push(line);
  }
  return blocks.map(parseBlock);
}

// ---------- pid -> app label ----------

export const INTERP = /^(python[\d.]*|node|ruby|java|bun|deno|perl|php)$/i;

export function scriptOf(args: string, comm: string): string | null {
  const rest = args.startsWith(comm) ? args.slice(comm.length) : args.split(/\s+/).slice(1).join(" ");
  const toks = rest.trim().split(/\s+/);
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === "-m" && toks[i + 1]) return toks[i + 1];
    if (toks[i] === "-c" || toks[i] === "-e") return toks[i];
    if (toks[i] && !toks[i].startsWith("-")) return path.basename(toks[i]).replace(/\.(py|js|mjs|ts|rb)$/, "");
  }
  return null;
}

export function labelFor(rawName: string, comm?: string, args?: string): { label: string; app?: string } {
  if (!comm) return { label: rawName };
  let label: string;
  let app: string | undefined;
  const m = /^(.*?\.app)(\/|$)/.exec(comm); // outermost .app: helpers fold into their parent app
  if (m) {
    app = m[1];
    label = path.basename(m[1], ".app");
  } else {
    label = path.basename(comm);
    if (/^\d[\d.]*$/.test(label)) {
      const parts = comm.split("/");
      const i = parts.lastIndexOf("versions");
      label = i > 0 ? parts[i - 1] : (parts[parts.length - 3] ?? label);
    }
  }
  if (INTERP.test(path.basename(comm).replace(/\.app$/, "")) || INTERP.test(label)) {
    const s = args ? scriptOf(args, comm) : null;
    if (s) label = `${label} · ${s}`;
  }
  return { label, app };
}

export async function psMap(pids: number[], col: "comm" | "args"): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  if (!pids.length) return out;
  const txt = await sh("/bin/ps", ["-ww", "-o", `pid=,${col}=`, "-p", pids.join(",")]);
  for (const line of txt.split("\n")) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (m) out[Number(m[1])] = m[2];
  }
  return out;
}

// Fills the persistent pid cache for every (pid,name) not cached yet; only new pids cost a `ps` call.
export async function resolveLabels(items: [number, string][], pids: Last["pids"], paths: Last["paths"], now: number) {
  const need: number[] = [];
  for (const [pid, name] of items) {
    const hit = pids[pid];
    if (hit && hit.n === name) hit.s = now;
    else if (!need.includes(pid)) need.push(pid);
  }
  if (!need.length) return;
  const comms = await psMap(need, "comm");
  const interp = need.filter(
    (p) => comms[p] && (INTERP.test(path.basename(comms[p]).replace(/\.app$/, "")) || /Python\.app/i.test(comms[p])),
  );
  const argv = await psMap(interp, "args");
  for (const [pid, name] of items) {
    if (!need.includes(pid) || pids[pid]?.n === name) continue;
    const r = labelFor(name, comms[pid], argv[pid]);
    pids[pid] = { n: name, label: r.label, s: now };
    if (r.app) paths[r.label] = r.app;
  }
}

export function remoteIp(conn: string): string | null {
  const sp = conn.indexOf(" ");
  const proto = conn.slice(0, sp);
  const r = conn.slice(sp + 1).split("<->")[1];
  if (!r || r.startsWith("*")) return null;
  const sep = proto.endsWith("6") ? r.lastIndexOf(".") : r.lastIndexOf(":");
  return sep > 0 ? r.slice(0, sep) : r;
}
