import { groupProcesses } from "./group";
import { listProcesses } from "./list-processes";
import { PROTECTED_ERROR, isProtected } from "./protected";
import type { AppRow, KillResult, RawProc } from "./types";

/* 结束进程组。

   默认 SIGTERM（整组 + 子孙，子先父后），force 才 SIGKILL。任何失败都返回 ok:false ——
   不把「信号发出去了」当成功，更不把权限不足吞成成功。 */

export interface KillOptions {
  /** true = SIGKILL，默认 SIGTERM。 */
  force?: boolean;
  /** 只结束这些 PID（仍须是 row 组内成员，且照样重验）；默认整组。 */
  pids?: number[];
  /** 采集入口，测试注入用；默认真实 ps。 */
  enumerate?: () => Promise<RawProc[]>;
  /** 复核轮询超时毫秒数，默认 600ms。 */
  timeoutMs?: number;
  /** 复核步进毫秒数，默认 50ms。 */
  pollIntervalMs?: number;
}

const CHANGED = "Target process changed, exited, or is protected. Please refresh.";

/** 永不作目标：本进程与其全部祖先（结束 Raycast 宿主就没了）、pid 0/1、系统关键进程、非当前用户所有。 */
function blockedPids(raw: RawProc[]): Set<number> {
  const byPid = new Map(raw.map((proc) => [proc.pid, proc]));
  const blocked = new Set<number>([process.pid, 0, 1]);
  let ancestor = byPid.get(process.pid)?.ppid;
  while (ancestor && !blocked.has(ancestor)) {
    blocked.add(ancestor);
    ancestor = byPid.get(ancestor)?.ppid;
  }
  for (const proc of raw) if (isProtected(proc)) blocked.add(proc.pid);
  return blocked;
}

/** 进程在树里的深度：越深越先杀，避免父进程重新派生子进程。 */
function depthOf(pid: number, byPid: Map<number, RawProc>): number {
  let depth = 0;
  let current = byPid.get(pid);
  const seen = new Set<number>();
  while (current && current.ppid > 1 && !seen.has(current.ppid)) {
    seen.add(current.ppid);
    depth += 1;
    current = byPid.get(current.ppid);
  }
  return depth;
}

function hasExited(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

export async function killProcess(row: AppRow, options: KillOptions = {}): Promise<KillResult> {
  const { force = false, enumerate = listProcesses, timeoutMs = 600, pollIntervalMs = 50 } = options;
  if (row.protected) return { ok: false, killed: [], error: PROTECTED_ERROR };

  let raw: RawProc[];
  try {
    raw = await enumerate();
  } catch (error) {
    return { ok: false, killed: [], error: (error as Error).message || "Failed to inspect processes." };
  }
  if (!raw || !raw.length) return { ok: false, killed: [], error: CHANGED };

  const byPid = new Map(raw.map((proc) => [proc.pid, proc]));

  // PID 会复用：id + snapshotToken 都要和用户按下那一刻的完全一致，且目标 PID 仍在组内。
  const current = groupProcesses(raw).find(
    (candidate) => candidate.id === row.id && candidate.snapshotToken === row.snapshotToken,
  );
  if (!current || current.protected) return { ok: false, killed: [], error: CHANGED };

  const expected = new Set(options.pids ?? (row.allPids.length ? row.allPids : [row.pid]));
  const blocked = blockedPids(raw);
  const roots = current.allPids.filter((pid) => expected.has(pid) && !blocked.has(pid));
  if (!roots.length) return { ok: false, killed: [], error: CHANGED };

  const childrenOf = new Map<number, number[]>();
  for (const proc of raw) {
    const children = childrenOf.get(proc.ppid);
    if (children) children.push(proc.pid);
    else childrenOf.set(proc.ppid, [proc.pid]);
  }
  const targets = new Set<number>();
  const stack = [...roots];
  while (stack.length) {
    const pid = stack.pop()!;
    if (targets.has(pid) || blocked.has(pid)) continue;
    targets.add(pid);
    for (const child of childrenOf.get(pid) ?? []) stack.push(child);
  }

  const order = [...targets].sort((a, b) => depthOf(b, byPid) - depthOf(a, byPid) || b - a);
  const signal = force ? "SIGKILL" : "SIGTERM";
  const deadPids = new Set<number>();
  const pendingPids: number[] = [];
  const errors: string[] = [];

  // 发信号前再采一轮：PID 可能已复用，startedAt 对不上就跳过。
  const plannedStarted = new Map<number, string>();
  for (const pid of order) {
    const proc = byPid.get(pid);
    if (proc) plannedStarted.set(pid, proc.startedAt);
  }
  let liveRaw: RawProc[];
  try {
    liveRaw = await enumerate();
  } catch (error) {
    return { ok: false, killed: [], error: (error as Error).message || "Failed to re-inspect processes." };
  }
  const liveByPid = new Map(liveRaw.map((proc) => [proc.pid, proc]));

  for (const pid of order) {
    const planned = plannedStarted.get(pid);
    const live = liveByPid.get(pid);
    if (!planned || !live || live.startedAt !== planned) continue;
    try {
      process.kill(pid, signal);
      pendingPids.push(pid);
    } catch (error) {
      // ESRCH = 采样到发信号之间它自己退了，目标已达成，不算失败。
      if ((error as NodeJS.ErrnoException).code === "ESRCH") deadPids.add(pid);
      else errors.push(`PID ${pid}: ${(error as Error).message}`);
    }
  }

  if (errors.length) return { ok: false, killed: [...deadPids], error: errors.join("; ") };

  const remaining = new Set(pendingPids);
  const deadline = Date.now() + timeoutMs;
  while (remaining.size > 0) {
    for (const pid of remaining) {
      if (hasExited(pid)) {
        deadPids.add(pid);
        remaining.delete(pid);
      }
    }
    if (remaining.size === 0) break;
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, Math.max(0, deadline - Date.now()))));
  }

  if (remaining.size > 0) {
    const error = force ? "Process did not exit after Force Quit." : "Process did not exit. Try Force Quit.";
    return { ok: false, killed: [...deadPids], error };
  }

  if (!deadPids.size) return { ok: false, killed: [], error: "No processes were terminated. Target may have changed." };
  return { ok: true, killed: [...deadPids] };
}
