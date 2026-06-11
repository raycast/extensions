import { ChildProcess } from "node:child_process";
import { runSsh, spawnSsh } from "./ssh";
import { shellQuote } from "./shell";

function splitOnSentinel(s: string, sentinel: string): [string, string] {
  const idx = s.indexOf(sentinel);
  if (idx < 0) return [s, ""];
  return [s.slice(0, idx), s.slice(idx + sentinel.length)];
}

/**
 * Parse the output of `squeue -O "JobID:N,tres-alloc:M"` into a map of
 * JobID -> AllocTRES string. The output uses fixed-width columns where the
 * first `idWidth` characters are the JobID, followed by the TRES string
 * (also right-padded to its declared width).
 */
function parseAllocTres(block: string, idWidth: number): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of block.split("\n")) {
    if (!rawLine.trim()) continue;
    const id = rawLine.slice(0, idWidth).trim();
    const tres = rawLine.slice(idWidth).trim();
    if (!id) continue;
    map.set(id, tres);
  }
  return map;
}

export type JobState =
  | "RUNNING"
  | "PENDING"
  | "COMPLETING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMEOUT"
  | "PREEMPTED"
  | "SUSPENDED"
  | "CONFIGURING"
  | "STAGE_OUT"
  | string;

export type Job = {
  jobId: string;
  partition: string;
  name: string;
  state: JobState;
  elapsed: string;
  timeLimit: string;
  nodes: string;
  cpus: string;
  reasonOrNodeList: string;
  tres: string;
  user?: string;
};

export type SlurmNode = {
  name: string;
  state: string;
  partitions: string[];
  cpuLoad: number | null;
  cpuTot: number;
  cpuAlloc: number;
  realMemoryMB: number;
  freeMemoryMB: number;
  allocMemoryMB: number;
  gres: string;
  gresUsed: string;
  allocTres: string;
  features: string;
  reason: string;
};

export type JobDetail = {
  raw: string;
  fields: Record<string, string>;
};

export async function detectUser(host: string): Promise<string> {
  const out = await runSsh(host, "whoami", { timeout: 10_000 });
  return out.trim();
}

// ---------- jobs ----------

export async function listJobs(host: string, user: string): Promise<Job[]> {
  const fmt = "%i|%P|%j|%T|%M|%l|%D|%C|%R|%b";
  const allocFmt = "JobID:64,tres-alloc:512";
  const cmd =
    `squeue -h -u ${shellQuote(user)} -o ${shellQuote(fmt)}; ` +
    `echo '---ALLOC---'; ` +
    `squeue -h -u ${shellQuote(user)} -O ${shellQuote(allocFmt)}`;
  const out = await runSsh(host, cmd);
  const [primary, allocBlock = ""] = splitOnSentinel(out, "---ALLOC---");
  const allocByJob = parseAllocTres(allocBlock, 64);
  const jobs = primary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseJobRow);
  for (const j of jobs) {
    const a = allocByJob.get(j.jobId);
    if (a) j.tres = a;
  }
  return jobs;
}

function parseJobRow(row: string): Job {
  const p = row.split("|");
  return {
    jobId: p[0] ?? "",
    partition: p[1] ?? "",
    name: p[2] ?? "",
    state: (p[3] ?? "") as JobState,
    elapsed: p[4] ?? "",
    timeLimit: p[5] ?? "",
    nodes: p[6] ?? "",
    cpus: p[7] ?? "",
    reasonOrNodeList: p[8] ?? "",
    tres: p[9] ?? "",
  };
}

export async function listAllJobs(host: string): Promise<Job[]> {
  const fmt = "%i|%P|%j|%T|%M|%l|%D|%C|%R|%u|%b";
  const allocFmt = "JobID:64,tres-alloc:512";
  const cmd = `squeue -h -o ${shellQuote(fmt)}; ` + `echo '---ALLOC---'; ` + `squeue -h -O ${shellQuote(allocFmt)}`;
  const out = await runSsh(host, cmd);
  const [primary, allocBlock = ""] = splitOnSentinel(out, "---ALLOC---");
  const allocByJob = parseAllocTres(allocBlock, 64);
  const jobs = primary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseAllJobRow);
  for (const j of jobs) {
    const a = allocByJob.get(j.jobId);
    if (a) j.tres = a;
  }
  return jobs;
}

function parseAllJobRow(row: string): Job {
  const p = row.split("|");
  return {
    jobId: p[0] ?? "",
    partition: p[1] ?? "",
    name: p[2] ?? "",
    state: (p[3] ?? "") as JobState,
    elapsed: p[4] ?? "",
    timeLimit: p[5] ?? "",
    nodes: p[6] ?? "",
    cpus: p[7] ?? "",
    reasonOrNodeList: p[8] ?? "",
    user: p[9] ?? "",
    tres: p[10] ?? "",
  };
}

export async function showJob(host: string, jobId: string): Promise<JobDetail> {
  const raw = await runSsh(host, `scontrol show job ${shellQuote(jobId)}`);
  const fields = tokenizeKv(raw);
  return { raw, fields };
}

export async function cancelJob(host: string, jobId: string): Promise<void> {
  await runSsh(host, `scancel ${shellQuote(jobId)}`);
}

// ---------- nodes ----------

export async function listNodes(host: string): Promise<SlurmNode[]> {
  const out = await runSsh(host, "scontrol show node --oneliner");
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseNodeLine);
}

function parseNodeLine(line: string): SlurmNode {
  const fields = tokenizeKv(line);
  return {
    name: fields.NodeName ?? "",
    state: fields.State ?? "",
    partitions: (fields.Partitions ?? "").split(",").filter(Boolean),
    cpuLoad: fields.CPULoad && fields.CPULoad !== "N/A" ? Number(fields.CPULoad) : null,
    cpuTot: numOr(fields.CPUTot, 0),
    cpuAlloc: numOr(fields.CPUAlloc, 0),
    realMemoryMB: numOr(fields.RealMemory, 0),
    freeMemoryMB: numOr(fields.FreeMem, 0),
    allocMemoryMB: numOr(fields.AllocMem, 0),
    gres: fields.Gres ?? "",
    gresUsed: fields.GresUsed ?? "",
    allocTres: fields.AllocTRES ?? fields.AllocTres ?? "",
    features: fields.AvailableFeatures ?? fields.Features ?? "",
    reason: fields.Reason ?? "",
  };
}

function numOr(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse `Key=Value` tokens out of a whitespace-separated line, handling
 * quoted Reason="..." values. Ignores tokens without an `=`.
 */
function tokenizeKv(line: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  const n = line.length;
  while (i < n) {
    while (i < n && /\s/.test(line[i])) i++;
    if (i >= n) break;
    const keyStart = i;
    while (i < n && line[i] !== "=" && !/\s/.test(line[i])) i++;
    if (line[i] !== "=") {
      // bare token, skip
      while (i < n && !/\s/.test(line[i])) i++;
      continue;
    }
    const key = line.slice(keyStart, i);
    i++; // skip '='
    let value: string;
    if (line[i] === '"') {
      i++;
      const start = i;
      while (i < n && line[i] !== '"') i++;
      value = line.slice(start, i);
      if (line[i] === '"') i++;
    } else {
      const start = i;
      while (i < n && !/\s/.test(line[i])) i++;
      value = line.slice(start, i);
    }
    if (!(key in out)) out[key] = value;
  }
  return out;
}

// ---------- log tail ----------

export function tailFile(host: string, filePath: string): ChildProcess {
  return spawnSsh(host, `tail -n 200 -F ${shellQuote(filePath)}`);
}
