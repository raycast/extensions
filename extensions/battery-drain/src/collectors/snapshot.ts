import { ProcessEnergy, ProcessInfo, Snapshot } from "../types";
import { parseAssertions } from "./assertions";
import { run, Runner } from "./exec";
import { parseIoreg } from "./ioreg";
import { parsePmsetBatt } from "./pmset-batt";
import { readProcesses } from "./ps";
import { applySmc, parseSmc, SMC_KEYS, SmcReader } from "./smc";
import { readSmcKeys } from "./smc-native";
import { parseTop } from "./top";

const ANCESTOR_ROUNDS = 3;
// Enough processes for apps to add up their helpers; top takes the same ~1.3 s either way.
const TOP_SAMPLE = 50;
const SMC_TIMEOUT_MS = 2000;

export type CollectOptions = {
  smc?: SmcReader;
  /** false for a power-only poll: skips top, ps and the sleep-blocker lookup, which cost the most. */
  processes?: boolean;
};

// SMC only makes the reading live; ioreg still has one, so a failure (e.g. an older Mac) is not an error.
async function readSmc(reader: SmcReader): Promise<Record<string, number>> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<Record<string, number>>((resolve) => {
    timer = setTimeout(() => resolve({}), SMC_TIMEOUT_MS);
  });
  try {
    return await Promise.race([reader(SMC_KEYS).catch(() => ({})), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function collectSnapshot(
  runner: Runner = run,
  now: number = Date.now(),
  { smc = readSmcKeys, processes: withProcesses = true }: CollectOptions = {},
): Promise<Snapshot> {
  const errors: string[] = [];
  const attempt = async <T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      return fallback;
    }
  };

  const [ioreg, smcValues, source, blockers, topRows] = await Promise.all([
    attempt("ioreg", parseIoreg(""), async () =>
      parseIoreg(await runner("/usr/sbin/ioreg", ["-rn", "AppleSmartBattery"])),
    ),
    readSmc(smc),
    attempt("pmset batt", undefined, async () => parsePmsetBatt(await runner("/usr/bin/pmset", ["-g", "batt"]))),
    withProcesses
      ? attempt("pmset assertions", [], async () =>
          parseAssertions(await runner("/usr/bin/pmset", ["-g", "assertions"])),
        )
      : [],
    withProcesses
      ? attempt<ProcessEnergy[]>("top", [], async () =>
          parseTop(
            await runner("/usr/bin/top", [
              "-l",
              "2",
              "-s",
              "1",
              "-o",
              "power",
              "-n",
              String(TOP_SAMPLE),
              "-stats",
              "pid,power,cpu,command",
            ]),
          ),
        )
      : [],
  ]);
  const battery = applySmc(ioreg, parseSmc(smcValues), now);

  if (!withProcesses) {
    return { t: now, battery, source, processes: [], processInfo: new Map(), blockers: [], errors, partial: true };
  }

  const ps = (list: number[]) => readProcesses(list, runner);
  const unique = (list: number[]) => [...new Set(list)].filter((pid) => pid > 0);

  // Sleep blockers are looked up too, so their owner (who may terminate them) and parent are known.
  const pids = unique([...topRows.map((p) => p.pid), ...blockers.map((b) => b.pid)]);
  const processInfo =
    pids.length === 0
      ? new Map<number, ProcessInfo>()
      : await attempt("ps", new Map<number, ProcessInfo>(), () => ps(pids));

  // Climb a few levels above each blocker to find the app that started it (caffeinate ← zsh ← claude).
  let frontier = blockers.map((b) => b.pid);
  for (let round = 0; round < ANCESTOR_ROUNDS; round++) {
    const missing = unique(frontier.map((pid) => processInfo.get(pid)?.ppid ?? 0)).filter(
      (pid) => pid > 1 && !processInfo.has(pid),
    );
    if (missing.length === 0) break;
    const found = await attempt("ps ancestors", new Map<number, ProcessInfo>(), () => ps(missing));
    for (const [pid, info] of found) processInfo.set(pid, info);
    frontier = missing;
  }

  // The top we just ran measures itself; it has exited by the time ps runs.
  // top's own ordering is not strict, so sort by energy for the "top five" lists.
  const processes = topRows
    .filter((p) => !(p.command === "top" && processInfo.size > 0 && !processInfo.has(p.pid)))
    // top truncates names to 16 characters; ps has the full name. ps shows the name a process set for
    // itself ("npm exec …" for node), so only take it when it extends top's truncated one, or when top
    // shows a bare version number as the title (Claude Code shows "2.1.280").
    .map((p) => {
      const full = processInfo.get(p.pid)?.command;
      const versionTitle = /^\d+(\.\d+)+$/.test(p.command);
      return full && (full.startsWith(p.command) || versionTitle) ? { ...p, command: full } : p;
    })
    .sort((a, b) => b.energy - a.energy);

  return { t: now, battery, source, processes, processInfo, blockers, errors, processesAt: now };
}

// Collectors a power-only poll skips; their last failures still apply.
const PROCESS_COLLECTORS = /^(top|ps|ps ancestors|pmset assertions):/;

/**
 * A power-only poll's fresh readings over the last full poll's processes, sleep blockers and their
 * failures. A full poll whose top failed keeps the last process list too, with its error shown, rather
 * than emptying Apps and Processes until the next full poll.
 */
export function mergeSnapshot(prev: Snapshot | undefined, next: Snapshot): Snapshot {
  if (prev && !next.partial && next.errors.some((e) => e.startsWith("top:"))) {
    return { ...next, processes: prev.processes, processInfo: prev.processInfo, processesAt: prev.processesAt };
  }
  if (!next.partial || !prev) return next;
  return {
    ...next,
    processes: prev.processes,
    processInfo: prev.processInfo,
    blockers: prev.blockers,
    processesAt: prev.processesAt,
    errors: [...next.errors, ...prev.errors.filter((e) => PROCESS_COLLECTORS.test(e))],
    partial: undefined,
  };
}

export { hasProcessSample } from "../history/store";
