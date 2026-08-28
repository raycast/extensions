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
  return parseJobsWithAllocTres(out, parseJobRow);
}

// Lightweight variant for the menu bar's background refresh. Skips the second
// `squeue -O tres-alloc` call and the AllocTRES map join from listJobs, because
// the menu bar only renders state counts + basic job fields and never reads
// `tres`. `tres` is left as the `%b` GPU shorthand from parseJobRow. Keeping this
// tick cheap is what lets the background refresh land the title/color reliably
// without doing (and buffering) work the menu bar throws away.
export async function listJobsBrief(host: string, user: string): Promise<Job[]> {
  const fmt = "%i|%P|%j|%T|%M|%l|%D|%C|%R|%b";
  const out = await runSsh(host, `squeue -h -u ${shellQuote(user)} -o ${shellQuote(fmt)}`);
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseJobRow);
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
  return parseJobsWithAllocTres(out, parseAllJobRow);
}

function parseJobsWithAllocTres(out: string, parseRow: (row: string) => Job): Job[] {
  const [primary, allocBlock = ""] = splitOnSentinel(out, "---ALLOC---");
  const allocByJob = parseAllocTres(allocBlock, 64);
  const jobs = primary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseRow);
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

// One-shot read of the *bottom* of a log file for the embedded Output/Error
// detail panes. We never read the whole file — ML run logs are routinely
// gigabytes — so this is bounded twice: `tail -c` caps the bytes pulled over the
// wire (a CR-redraw progress bar can make a single "line" enormous, see the
// tailview-cr-buffer-leak note), then CR redraws are flattened to newlines and
// `tail -n` keeps the last `lines`. The newest content ends up at the bottom.
const LOG_TAIL_BYTES = 128 * 1024;

export async function readLogTail(host: string, filePath: string, lines: number): Promise<string> {
  const n = Math.max(1, Math.floor(lines));
  const cmd = `tail -c ${LOG_TAIL_BYTES} -- ${shellQuote(filePath)} | tr '\\r' '\\n' | tail -n ${n}`;
  return runSsh(host, cmd);
}

// ---------- live job metrics ----------

// Portable collector that joins a RUNNING job's allocation via `srun --overlap`
// and streams one tick per second: per-GPU utilization/memory from nvidia-smi
// (device-scoped to the job) plus job-wide CPU%/RAM% from the job cgroup
// (cgroup v2 primary, v1 fallback). Single-quoted JS strings keep the shell
// `${...}` expansions literal; see parseMetricStream for the output format.
const METRICS_SCRIPT = [
  "NCPU=${SLURM_CPUS_ON_NODE:-1}",
  "if [ -f /sys/fs/cgroup/cgroup.controllers ]; then",
  '  rel=$(sed -n "s/^0:://p" /proc/self/cgroup); job=${rel%%/step_*}; CG=/sys/fs/cgroup$job; MODE=v2',
  "else",
  '  crel=$(grep -m1 -E ":cpuacct:|:cpu,cpuacct:|:cpu:" /proc/self/cgroup | cut -d: -f3); cjob=${crel%%/step_*}',
  '  mrel=$(grep -m1 ":memory:" /proc/self/cgroup | cut -d: -f3); mjob=${mrel%%/step_*}',
  "  CPUF=/sys/fs/cgroup/cpu,cpuacct$cjob/cpuacct.usage; MEMC=/sys/fs/cgroup/memory$mjob/memory.usage_in_bytes; MEMM=/sys/fs/cgroup/memory$mjob/memory.limit_in_bytes; MODE=v1",
  "fi",
  'prev=""; ptime=""',
  "while true; do",
  '  now=$(date +%s%3N); echo "T $now"',
  '  nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits | sed "s/^/G /"',
  '  if [ "$MODE" = v2 ]; then',
  '    usage=$(grep usage_usec "$CG/cpu.stat" 2>/dev/null | cut -d" " -f2)',
  '    memc=$(cat "$CG/memory.current" 2>/dev/null); memm=$(cat "$CG/memory.max" 2>/dev/null)',
  "  else",
  '    raw=$(cat "$CPUF" 2>/dev/null); usage=$(( ${raw:-0} / 1000 ))',
  '    memc=$(cat "$MEMC" 2>/dev/null); memm=$(cat "$MEMM" 2>/dev/null)',
  "  fi",
  '  cpu="-"',
  '  if [ -n "$prev" ] && [ -n "$usage" ]; then',
  "    dt=$(( now - ptime )); dus=$(( usage - prev ))",
  '    cpu=$(awk -v dus=$dus -v dt=$dt -v n=$NCPU "BEGIN{printf \\"%.1f\\", (dus/1000.0)/dt/n*100}")',
  "  fi",
  "  prev=$usage; ptime=$now",
  '  echo "C $cpu $memc $memm"; echo "E"; sleep 1',
  "done",
].join("\n");

export function streamJobMetrics(host: string, jobId: string): ChildProcess {
  // Ship the script base64-encoded so its quoting survives the ssh → srun → bash
  // hops untouched (base64 has no shell-special characters).
  const b64 = Buffer.from(METRICS_SCRIPT).toString("base64");
  const inner = `echo ${b64} | base64 -d | bash`;
  const cmd = `srun --jobid=${shellQuote(jobId)} --overlap -n1 bash -c ${shellQuote(inner)}`;
  return spawnSsh(host, cmd);
}
