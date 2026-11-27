/**
 * Parses a JVM thread dump — the text `jstack <pid>`, `jcmd <pid>
 * Thread.print` or a SIGQUIT print produces — and derives what someone
 * debugging actually looks for: the state histogram, thread pools, lock
 * contention, deadlocks (both the ones the JVM reports and cycles found
 * independently from the lock graph), identical stacks and CPU hogs.
 *
 * The format is stable across HotSpot releases (JDK 8 through current):
 * a quoted thread name, attributes, an optional java.lang.Thread.State
 * line, `at` frames and `- locked/waiting` annotations. VM-internal
 * threads (GC, JIT) have no State line and are kept but marked.
 * Dependency-free on purpose: the CLI and the editor plugins bundle it.
 */

export type HeldLock = { address: string; className: string };

export type ThreadInfo = {
  name: string;
  /** The #N java thread id, absent for VM-internal threads. */
  javaId?: number;
  daemon: boolean;
  cpuMs?: number;
  elapsedS?: number;
  state?: string;
  stateDetail?: string;
  frames: string[];
  locksHeld: HeldLock[];
  /** The one lock this thread is blocked or waiting on, if any. */
  waitingOn?: HeldLock & { kind: 'blocked' | 'waiting' | 'parking' };
};

export type Deadlock = { cycle: string[]; reportedByJvm: boolean };

export type ThreadDumpAnalysis = {
  timestamp?: string;
  jvm?: string;
  threads: ThreadInfo[];
  javaThreadCount: number;
  vmThreadCount: number;
  daemonCount: number;
  states: Record<string, number>;
  pools: { prefix: string; count: number; states: Record<string, number> }[];
  deadlocks: Deadlock[];
  contention: { address: string; className: string; holder?: string; waiters: string[] }[];
  hotStacks: { top: string[]; count: number; threads: string[] }[];
  topCpu: { name: string; cpuMs: number }[];
};

const HEADER = /^"(.+)" (?:#(\d+) )?(daemon )?(?=.*(?:prio=|os_prio=|tid=))/;
const STATE = /^\s+java\.lang\.Thread\.State: (\S+)(?: \((.+)\))?/;
const FRAME = /^\s+at (.+)/;
const LOCKED = /^\s+- locked <(0x[0-9a-f]+)> \(a (.+)\)/;
const WAIT_LOCK = /^\s+- waiting to lock <(0x[0-9a-f]+)> \(a (.+)\)/;
const WAIT_ON = /^\s+- waiting on <(0x[0-9a-f]+)> \(a (.+)\)/;
const PARKING = /^\s+- parking to wait for\s+<(0x[0-9a-f]+)> \(a (.+)\)/;

export function parseThreadDump(text: string): ThreadDumpAnalysis {
  const lines = text.split('\n');
  const threads: ThreadInfo[] = [];
  let timestamp: string | undefined;
  let jvm: string | undefined;
  let current: ThreadInfo | null = null;
  const reportedCycles: string[][] = [];
  let reportBuf: string[] | null = null;

  for (const line of lines) {
    if (!timestamp && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(line)) timestamp = line.trim();
    if (!jvm && line.startsWith('Full thread dump')) jvm = line.replace('Full thread dump', '').replace(/:\s*$/, '').trim();

    if (line.startsWith('Found') && line.includes('Java-level deadlock')) {
      reportBuf = [];
      continue;
    }
    if (reportBuf !== null) {
      const m = line.match(/^"(.+)":$/);
      if (m) {
        reportBuf.push(m[1]);
        continue;
      }
      if (line.startsWith('Java stack information') || /^Found \d+ deadlock/.test(line)) {
        if (reportBuf.length) reportedCycles.push(reportBuf);
        reportBuf = null;
      }
      if (reportBuf !== null) continue;
    }

    const h = line.match(HEADER);
    if (h) {
      const cpu = line.match(/cpu=([\d.]+)ms/);
      const elapsed = line.match(/elapsed=([\d.]+)s/);
      current = {
        name: h[1],
        javaId: h[2] ? Number(h[2]) : undefined,
        daemon: Boolean(h[3]),
        cpuMs: cpu ? Number(cpu[1]) : undefined,
        elapsedS: elapsed ? Number(elapsed[1]) : undefined,
        frames: [],
        locksHeld: [],
      };
      threads.push(current);
      continue;
    }
    if (!current) continue;

    const s = line.match(STATE);
    if (s) {
      current.state = s[1];
      current.stateDetail = s[2];
      continue;
    }
    const f = line.match(FRAME);
    if (f) {
      current.frames.push(f[1]);
      continue;
    }
    const held = line.match(LOCKED);
    if (held) {
      current.locksHeld.push({ address: held[1], className: held[2] });
      continue;
    }
    const wl = line.match(WAIT_LOCK);
    if (wl) {
      current.waitingOn = { address: wl[1], className: wl[2], kind: 'blocked' };
      continue;
    }
    const wo = line.match(WAIT_ON);
    if (wo) {
      // Object.wait() inside a monitor: the thread holds and waits on the
      // same object; that is waiting, not contention.
      if (!current.waitingOn) current.waitingOn = { address: wo[1], className: wo[2], kind: 'waiting' };
      continue;
    }
    const pk = line.match(PARKING);
    if (pk) {
      current.waitingOn = { address: pk[1], className: pk[2], kind: 'parking' };
      continue;
    }
    if (line.trim() === '') current = null;
  }
  if (reportBuf !== null && reportBuf.length) reportedCycles.push(reportBuf);

  const javaThreads = threads.filter((t) => t.state !== undefined);
  const states: Record<string, number> = {};
  for (const t of javaThreads) states[t.state!] = (states[t.state!] ?? 0) + 1;

  // Pools: a shared name with a trailing counter, e.g. pool-worker-3,
  // ForkJoinPool.commonPool-worker-2, http-nio-8080-exec-14.
  const poolMap = new Map<string, ThreadInfo[]>();
  for (const t of javaThreads) {
    const prefix = t.name.replace(/[-_ #]?\d+$/, '');
    if (prefix === t.name) continue;
    poolMap.set(prefix, [...(poolMap.get(prefix) ?? []), t]);
  }
  const pools = [...poolMap.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([prefix, list]) => {
      const st: Record<string, number> = {};
      for (const t of list) st[t.state!] = (st[t.state!] ?? 0) + 1;
      return { prefix, count: list.length, states: st };
    })
    .sort((a, b) => b.count - a.count);

  // Contention: who waits on what, and who holds it. A thread inside
  // Object.wait() has RELEASED the monitor it shows as locked — the dump
  // prints the acquire that led to the wait — so it does not count as the
  // holder of the address it is waiting on.
  const holderOf = new Map<string, string>();
  for (const t of threads) {
    for (const l of t.locksHeld) {
      if (t.waitingOn && t.waitingOn.kind !== 'blocked' && t.waitingOn.address === l.address) continue;
      holderOf.set(l.address, t.name);
    }
  }
  const waiterMap = new Map<string, { className: string; waiters: string[] }>();
  for (const t of threads) {
    if (t.waitingOn?.kind === 'blocked') {
      const e = waiterMap.get(t.waitingOn.address) ?? { className: t.waitingOn.className, waiters: [] };
      e.waiters.push(t.name);
      waiterMap.set(t.waitingOn.address, e);
    }
  }
  const contention = [...waiterMap.entries()]
    .map(([address, e]) => ({ address, className: e.className, holder: holderOf.get(address), waiters: e.waiters }))
    .sort((a, b) => b.waiters.length - a.waiters.length);

  // Deadlocks: walk waiting->holder edges; a cycle is a deadlock. The JVM
  // reports monitor deadlocks itself, but dumps pasted from older tools or
  // trimmed logs often lose that section, so find them independently too.
  const byName = new Map(threads.map((t) => [t.name, t]));
  const cycles: string[][] = [];
  const seenCycle = new Set<string>();
  for (const t of threads) {
    const path: string[] = [];
    let cur: ThreadInfo | undefined = t;
    // Only monitor contention (BLOCKED) can deadlock this way: a thread in
    // Object.wait() or a park has released or never held the lock.
    while (cur && cur.waitingOn?.kind === 'blocked' && path.length <= threads.length) {
      path.push(cur.name);
      const holder = holderOf.get(cur.waitingOn.address);
      if (!holder) break;
      const i = path.indexOf(holder);
      if (i !== -1) {
        const cycle = path.slice(i);
        const key = [...cycle].sort().join('|');
        if (!seenCycle.has(key)) {
          seenCycle.add(key);
          cycles.push(cycle);
        }
        break;
      }
      cur = byName.get(holder);
    }
  }
  const reportedKeys = new Set(reportedCycles.map((c) => [...c].sort().join('|')));
  const deadlocks: Deadlock[] = cycles.map((cycle) => ({
    cycle,
    reportedByJvm: reportedKeys.has([...cycle].sort().join('|')),
  }));
  // A JVM-reported deadlock the walk could not rebuild still counts.
  for (const rc of reportedCycles) {
    const key = [...rc].sort().join('|');
    if (!seenCycle.has(key)) deadlocks.push({ cycle: rc, reportedByJvm: true });
  }

  // Identical stacks: many threads parked in the same place is the shape of
  // a stuck pool or an undersized downstream.
  const stackMap = new Map<string, string[]>();
  for (const t of javaThreads) {
    if (!t.frames.length) continue;
    const key = t.frames.slice(0, 8).join('\u0000');
    stackMap.set(key, [...(stackMap.get(key) ?? []), t.name]);
  }
  const hotStacks = [...stackMap.entries()]
    .filter(([, names]) => names.length >= 2)
    .map(([key, names]) => ({ top: key.split('\u0000').slice(0, 4), count: names.length, threads: names }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCpu = threads
    .filter((t) => (t.cpuMs ?? 0) > 0)
    .sort((a, b) => b.cpuMs! - a.cpuMs!)
    .slice(0, 5)
    .map((t) => ({ name: t.name, cpuMs: t.cpuMs! }));

  if (!threads.length) throw new Error('No threads found: this does not look like a JVM thread dump (jstack or jcmd Thread.print output).');

  return {
    timestamp,
    jvm,
    threads,
    javaThreadCount: javaThreads.length,
    vmThreadCount: threads.length - javaThreads.length,
    daemonCount: javaThreads.filter((t) => t.daemon).length,
    states,
    pools,
    deadlocks,
    contention,
    hotStacks,
    topCpu,
  };
}

/** The analysis as terminal text: verdict first, evidence after. */
export function renderThreadDumpSummary(a: ThreadDumpAnalysis): string {
  const lines: string[] = [];
  const stateLine = Object.entries(a.states)
    .sort((x, y) => y[1] - x[1])
    .map(([s, n]) => `${n} ${s}`)
    .join(', ');
  lines.push(`${a.javaThreadCount} Java threads (${a.daemonCount} daemon) + ${a.vmThreadCount} VM threads${a.jvm ? `  ·  ${a.jvm}` : ''}`);
  lines.push(`states: ${stateLine}`);

  if (a.deadlocks.length) {
    lines.push('', `DEADLOCK${a.deadlocks.length > 1 ? 'S' : ''} — these threads wait on each other in a cycle; none can proceed:`);
    for (const d of a.deadlocks) {
      lines.push(`  ${d.cycle.join(' -> ')} -> ${d.cycle[0]}${d.reportedByJvm ? '' : '  (found from the lock graph; not in the JVM report)'}`);
    }
  }

  if (a.contention.length) {
    lines.push('', 'lock contention');
    for (const c of a.contention.slice(0, 5)) {
      lines.push(`  <${c.address}> (${c.className}): ${c.waiters.length} waiting${c.holder ? `, held by "${c.holder}"` : ''}`);
    }
  }

  if (a.pools.length) {
    lines.push('', 'thread pools');
    for (const p of a.pools.slice(0, 8)) {
      const st = Object.entries(p.states).map(([s, n]) => `${n} ${s}`).join(', ');
      lines.push(`  ${p.prefix}* ×${p.count}  (${st})`);
    }
  }

  if (a.hotStacks.length) {
    lines.push('', 'identical stacks — threads stopped in the same place');
    for (const h of a.hotStacks) {
      lines.push(`  ×${h.count}  ${h.top[0] ?? ''}`);
      for (const f of h.top.slice(1)) lines.push(`        ${f}`);
    }
  }

  if (a.topCpu.length) {
    lines.push('', 'cpu since start');
    for (const t of a.topCpu) lines.push(`  ${t.cpuMs.toFixed(1).padStart(10)} ms  ${t.name}`);
  }

  return lines.join('\n');
}
