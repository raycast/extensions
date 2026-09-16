import { Snapshot, entities, interval } from "./model";
import { nativeCall } from "./native";
export interface Statement {
  sql: string;
  params?: unknown[];
  ifMissingColumn?: [string, string];
}
export interface HistoryRow {
  key: string;
  kind: string;
  name: string;
  average: number | null;
  peak: number | null;
  cpu: number | null;
  reads: number | null;
  writes: number | null;
  observed: number;
  count: number;
  partialMetrics: number;
}
const schema: Statement[] = [
  {
    sql: "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  },
  {
    sql: "CREATE TABLE IF NOT EXISTS samples (time REAL NOT NULL, key TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, memory REAL, weight REAL NOT NULL, integral REAL NOT NULL, cpu REAL, reads REAL, writes REAL, observed REAL NOT NULL, PRIMARY KEY(time,key))",
  },
  {
    sql: "CREATE TABLE IF NOT EXISTS hours (time REAL NOT NULL, key TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, peak REAL, weight REAL NOT NULL, integral REAL NOT NULL, cpu REAL, reads REAL, writes REAL, observed REAL NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(time,key))",
  },
  {
    sql: "CREATE TABLE IF NOT EXISTS coverage (time REAL PRIMARY KEY, observed REAL NOT NULL, pressure INTEGER, compressed REAL, swap REAL)",
  },
  // Existing records have unknown completeness. Migrate conservatively without deleting history.
  {
    sql: "ALTER TABLE samples ADD COLUMN partial INTEGER NOT NULL DEFAULT 1",
    ifMissingColumn: ["samples", "partial"],
  },
  {
    sql: "ALTER TABLE hours ADD COLUMN partial INTEGER NOT NULL DEFAULT 1",
    ifMissingColumn: ["hours", "partial"],
  },
];
export class HistoryStore {
  constructor(
    readonly binary: string,
    readonly path: string,
  ) {}
  async run(statements: Statement[]): Promise<Record<string, unknown>[][]> {
    const result = await nativeCall<Record<string, unknown>[][]>(
      this.binary,
      "database",
      { path: this.path, statements: [...schema, ...statements] },
    );
    return result.slice(schema.length);
  }
  async meta(key: string) {
    return (
      await this.run([
        { sql: "SELECT value FROM meta WHERE key=?", params: [key] },
      ])
    )[0][0]?.value as string | undefined;
  }
  async setMeta(key: string, value: string) {
    await this.run([
      { sql: "INSERT OR REPLACE INTO meta VALUES (?,?)", params: [key, value] },
    ]);
  }
  async record(snapshot: Snapshot) {
    if ((await this.meta("paused")) === "true") return;
    const text = await this.meta("previous");
    let previous: Snapshot | undefined;
    try {
      previous = text ? (JSON.parse(text) as Snapshot) : undefined;
    } catch {
      /* A missing baseline starts a new measurement interval. */
    }
    // The Raycast foreground never writes samples; this also rejects near-duplicate scheduled runs.
    if (previous && snapshot.timestamp - previous.timestamp < 30) return;
    const statements = recordingStatements(snapshot, previous);
    statements.push({
      sql: "INSERT OR REPLACE INTO meta VALUES ('previous',?)",
      params: [JSON.stringify(snapshot)],
    });
    statements.push({
      sql: "INSERT OR IGNORE INTO meta VALUES ('started',?)",
      params: [String(snapshot.timestamp)],
    });
    // Recheck pause in the write transaction; a pending sampler cannot undo Pause or Clear.
    statements.unshift({
      sql: "CREATE TEMP TABLE may_record AS SELECT COALESCE((SELECT value FROM meta WHERE key='paused'),'false')!='true' AS allowed",
    });
    const gated = statements.map((s, index) => {
      if (index === 0) return s;
      if (s.sql.startsWith("INSERT OR REPLACE INTO meta VALUES"))
        return {
          ...s,
          sql: s.sql.replace(
            "VALUES ('previous',?)",
            "SELECT 'previous',? WHERE (SELECT allowed FROM may_record)",
          ),
        };
      if (s.sql.startsWith("INSERT OR IGNORE INTO meta VALUES"))
        return {
          ...s,
          sql: s.sql.replace(
            "VALUES ('started',?)",
            "SELECT 'started',? WHERE (SELECT allowed FROM may_record)",
          ),
        };
      if (s.sql.startsWith("INSERT OR IGNORE INTO samples VALUES"))
        return {
          ...s,
          sql: s.sql.replace(
            /VALUES \(([^)]+)\)/,
            "SELECT $1 WHERE (SELECT allowed FROM may_record)",
          ),
        };
      if (s.sql.startsWith("INSERT OR IGNORE INTO coverage VALUES"))
        return {
          ...s,
          sql: s.sql.replace(
            /VALUES \(([^)]+)\)/,
            "SELECT $1 WHERE (SELECT allowed FROM may_record)",
          ),
        };
      return s;
    });
    await this.run(gated);
  }
  async history(since: number, kind: string): Promise<HistoryRow[]> {
    const result = await this.run([
      {
        sql: `WITH data AS (
      SELECT key,kind,name,memory AS peak,weight,integral,cpu,reads,writes,observed,1 AS count,partial FROM samples WHERE time>=? AND kind=?
      UNION ALL SELECT key,kind,name,peak,weight,integral,cpu,reads,writes,observed,count,partial FROM hours WHERE time>=? AND kind=?)
      SELECT key,kind,MAX(name) AS name,COALESCE(SUM(integral)/NULLIF(SUM(weight),0),MAX(peak)) AS average,MAX(peak) AS peak,
      SUM(cpu) AS cpu,SUM(reads) AS reads,SUM(writes) AS writes,SUM(observed) AS observed,SUM(count) AS count,MAX(partial) AS partialMetrics FROM data GROUP BY key,kind`,
        params: [since, kind, since, kind],
      },
    ]);
    return result[0] as unknown as HistoryRow[];
  }
  async coverage(since: number) {
    const [rows] = await this.run([
      {
        sql: "SELECT MIN(time) AS first,MAX(time) AS last,SUM(observed) AS seconds,COUNT(*) AS count FROM coverage WHERE time>=?",
        params: [since],
      },
    ]);
    return rows[0] as {
      first: number | null;
      last: number | null;
      seconds: number | null;
      count: number;
    };
  }
  async clear() {
    // Clear also pauses, so an in-flight background read cannot immediately refill history.
    await this.run([
      { sql: "DELETE FROM samples" },
      { sql: "DELETE FROM hours" },
      { sql: "DELETE FROM coverage" },
      { sql: "DELETE FROM meta" },
      { sql: "INSERT INTO meta VALUES ('paused','true')" },
    ]);
  }
}
export function recordingStatements(
  snapshot: Snapshot,
  previous?: Snapshot,
): Statement[] {
  const rows = entities(snapshot, previous),
    time = snapshot.timestamp;
  const statements: Statement[] = rows.map((row) => {
    const weight = row.memory == null ? 0 : row.observed;
    return {
      sql: "INSERT OR IGNORE INTO samples VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      params: [
        time,
        row.key,
        row.kind,
        row.name,
        row.memory,
        weight,
        (row.memory ?? 0) * weight,
        row.cpuSeconds,
        row.readDelta,
        row.writeDelta,
        row.observed,
        row.partialMetrics ||
        row.cpuSeconds == null ||
        row.readDelta == null ||
        row.writeDelta == null
          ? 1
          : 0,
      ],
    };
  });
  statements.push({
    sql: "INSERT OR IGNORE INTO coverage VALUES (?,?,?,?,?)",
    params: [
      time,
      interval(snapshot, previous),
      snapshot.system.pressure,
      snapshot.system.compressed,
      snapshot.system.swapUsed,
    ],
  });
  const add = (field: string) =>
    `CASE WHEN hours.${field} IS NULL AND excluded.${field} IS NULL THEN NULL ELSE COALESCE(hours.${field},0)+COALESCE(excluded.${field},0) END`;
  // Compact complete hours only, avoiding a moving partial-hour boundary.
  const cutoff = Math.floor((time - 86400) / 3600) * 3600;
  statements.push({
    sql: `INSERT INTO hours SELECT CAST(time/3600 AS INTEGER)*3600,key,kind,MAX(name),MAX(memory),SUM(weight),SUM(integral),SUM(cpu),SUM(reads),SUM(writes),SUM(observed),COUNT(*),MAX(partial)
    FROM samples WHERE time<? GROUP BY CAST(time/3600 AS INTEGER),key,kind
    ON CONFLICT(time,key) DO UPDATE SET name=excluded.name,peak=COALESCE(MAX(hours.peak,excluded.peak),hours.peak,excluded.peak),
    weight=hours.weight+excluded.weight,integral=hours.integral+excluded.integral,cpu=${add("cpu")},reads=${add("reads")},writes=${add("writes")},observed=hours.observed+excluded.observed,count=hours.count+excluded.count,partial=MAX(hours.partial,excluded.partial)`,
    params: [cutoff],
  });
  statements.push(
    { sql: "DELETE FROM samples WHERE time<?", params: [cutoff] },
    { sql: "DELETE FROM hours WHERE time<?", params: [time - 7 * 86400] },
    { sql: "DELETE FROM coverage WHERE time<?", params: [time - 7 * 86400] },
  );
  return statements;
}
