import { run } from "./exec";
import type { AppRow, RawProc } from "./types";

/* macOS nettop 采样（网络分类）。两帧相减得到每秒速率，pid 从进程名列的 ".1234" 后缀取。

   ponytail: 采样一次固定 ~1s（nettop -L 2 -s 1），失败即网络分类不可用；
   没有移植 goose-monitor 的 probeNettop 预探测（能力开关直接由本次采样成败决定）。 */

const NETTOP_ARGS = ["-n", "-P", "-x", "-d", "-L", "2", "-s", "1", "-t", "external", "-J", "time,bytes_in,bytes_out"];

export interface NetRate {
  pid: number;
  downloadBps: number;
  uploadBps: number;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = String(text || "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

const parseTimeSeconds = (value: string): number | null => {
  const match = String(value)
    .trim()
    .match(/^(\d+):(\d+):(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const fraction = match[4] ? Number(`0.${match[4]}`) : 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + fraction;
};

const parseUnsigned = (value: string): bigint | null => {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  try {
    return BigInt(text);
  } catch {
    return null;
  }
};

const rateToNumber = (bytes: bigint, seconds: number): number | null => {
  if (seconds <= 0 || bytes < 0n) return null;
  const whole = bytes / 1000n;
  const remainder = bytes % 1000n;
  const bounded = whole > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(whole);
  return Math.max(0, (bounded * 1000 + Number(remainder)) / seconds);
};

export function parseNettop(text: string): NetRate[] {
  const frames: Map<number, { time: number; bytesIn: bigint; bytesOut: bigint }>[] = [];
  let frame: Map<number, { time: number; bytesIn: bigint; bytesOut: bigint }> | null = null;
  for (const row of parseCsv(text)) {
    if (String(row[0]).trim().toLowerCase() === "time") {
      frame = new Map();
      frames.push(frame);
      continue;
    }
    if (!frame || row.length < 4) continue;
    const time = parseTimeSeconds(row[0]);
    const pidMatch = String(row[1] || "").match(/\.(\d+)$/);
    const bytesIn = parseUnsigned(row[2]);
    const bytesOut = parseUnsigned(row[3]);
    if (time == null || !pidMatch || bytesIn == null || bytesOut == null) continue;
    frame.set(Number(pidMatch[1]), { time, bytesIn, bytesOut });
  }
  if (frames.length < 2) throw new Error("nettop did not return two frames");

  const previousFrame = frames[frames.length - 2];
  const currentFrame = frames[frames.length - 1];
  const rates: NetRate[] = [];
  for (const [pid, current] of currentFrame) {
    const previous = previousFrame.get(pid);
    if (!previous) continue;
    let seconds = current.time - previous.time;
    if (seconds < 0) seconds += 24 * 3600;
    // nettop -d（delta 模式）第 1 帧为进程累计基准，第 2 帧及后续帧输出的直接是采样区间的增量（Delta），除以时间间隔即瞬时速率。
    // 注：无需也不可做 current - previous（否则增量减去第 1 帧累计值会下溢/变为负数）。
    const downloadBps = rateToNumber(current.bytesIn, seconds);
    const uploadBps = rateToNumber(current.bytesOut, seconds);
    if (downloadBps == null || uploadBps == null) continue;
    rates.push({ pid, downloadBps, uploadBps });
  }
  return rates;
}

export function collectNettop(): Promise<NetRate[]> {
  return run("/usr/bin/nettop", NETTOP_ARGS, 2500).then(parseNettop);
}

/** 只在 before/after 两帧里 startedAt 一致的 PID 上贴速率，防 PID 复用串台。 */
export function attachNetworkRates(rows: AppRow[], rates: NetRate[], before: RawProc[], after: RawProc[]): void {
  const beforeByPid = new Map(before.map((proc) => [proc.pid, proc]));
  const afterByPid = new Map(after.map((proc) => [proc.pid, proc]));
  const safe = new Map<number, NetRate>();
  for (const rate of rates) {
    const first = beforeByPid.get(rate.pid);
    const current = afterByPid.get(rate.pid);
    if (first && current && first.startedAt === current.startedAt) safe.set(rate.pid, rate);
  }
  for (const row of rows) {
    const active = (row.allPids.length ? row.allPids : [row.pid]).filter((pid) => safe.has(pid));
    if (!active.length) continue;
    row.netDown = active.reduce((sum, pid) => sum + safe.get(pid)!.downloadBps, 0);
    row.netUp = active.reduce((sum, pid) => sum + safe.get(pid)!.uploadBps, 0);
  }
}
