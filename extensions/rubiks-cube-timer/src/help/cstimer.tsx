// A single solve. `time` is the raw solve time in milliseconds.
// `penalty` follows csTimer: 0 = none, 2000 = +2, -1 = DNF.
export type Solve = {
  time: number;
  scramble: string;
  date: number; // unix seconds
  penalty: number;
};

// Effective time used for stats: +2 adds 2000 ms, DNF counts as the worst possible.
export function effectiveTime(solve: Solve): number {
  if (solve.penalty === -1) return Infinity;
  return solve.time + (solve.penalty === 2000 ? 2000 : 0);
}

// Serialize to the csTimer export format so the file can be imported straight into csTimer.
export function exportToCsTimer(solves: Solve[]): string {
  const ordered = [...solves].sort((a, b) => a.date - b.date); // csTimer stores oldest-first

  const root: Record<string, unknown> = {};
  root["session1"] = ordered.map((s) => [[s.penalty, s.time], s.scramble, "", s.date]);
  for (let i = 2; i <= 15; i++) root[`session${i}`] = [];

  const sessionData: Record<string, unknown> = {};
  for (let i = 1; i <= 15; i++) {
    if (i === 1 && ordered.length > 0) {
      const count = ordered.length;
      const avg = ordered.reduce((sum, s) => sum + s.time, 0) / count;
      sessionData["1"] = {
        name: 1,
        opt: {},
        rank: 1,
        stat: [count, 0, avg],
        date: [ordered[0].date, ordered[count - 1].date],
      };
    } else {
      sessionData[String(i)] = { name: i, opt: {}, rank: i };
    }
  }

  root["properties"] = { sessionData: JSON.stringify(sessionData) };
  return JSON.stringify(root);
}

// Parse a csTimer export file. Reads every session and returns solves newest-first.
export function importFromCsTimer(text: string): Solve[] {
  const data = JSON.parse(text) as Record<string, unknown>;
  const solves: Solve[] = [];

  for (let i = 1; i <= 15; i++) {
    const session = data[`session${i}`];
    if (!Array.isArray(session)) continue;

    for (const entry of session) {
      if (!Array.isArray(entry)) continue;
      const [pt, scramble, , date] = entry;
      const penalty = Array.isArray(pt) ? pt[0] : 0;
      const time = Array.isArray(pt) ? pt[1] : pt;

      solves.push({
        time: Number(time) || 0,
        scramble: typeof scramble === "string" ? scramble : "",
        date: Number(date) || Math.floor(Date.now() / 1000),
        penalty: Number(penalty) || 0,
      });
    }
  }

  solves.sort((a, b) => b.date - a.date);
  return solves;
}

// Merge imported solves into the existing ones, dropping duplicates (same time + timestamp).
export function mergeSolves(existing: Solve[], incoming: Solve[]): Solve[] {
  const seen = new Set(existing.map((s) => `${s.date}-${s.time}`));
  const merged = [...existing];

  for (const s of incoming) {
    const key = `${s.date}-${s.time}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }

  merged.sort((a, b) => b.date - a.date);
  return merged;
}
