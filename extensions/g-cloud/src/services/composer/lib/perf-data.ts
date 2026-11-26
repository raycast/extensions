// Shared data loader for per-DAG performance (pure): last N runs + their task instances.
// Bounded by run count, not time window (airflow_monitoring alone has 100k+ runs).

import { AirflowClient } from "./airflow";
import { runHealth, runSeconds, summarize, taskStats } from "./stats";
import { DagRun, TaskInstance } from "./types";

export interface DagPerf {
  runs: DagRun[]; // newest first
  chronological: DagRun[]; // oldest first
  tis: TaskInstance[];
  tisTotal: number;
  tisCapped: boolean;
  runSummary: ReturnType<typeof summarize>;
  health: ReturnType<typeof runHealth>;
  tasks: ReturnType<typeof taskStats>;
}

export async function loadDagPerf(
  client: AirflowClient,
  dagId: string,
  lastRuns = 50,
  maxTis = 6000,
): Promise<DagPerf> {
  const { runs } = await client.listDagRuns(dagId, { limit: lastRuns, orderBy: "-execution_date" });
  const chronological = [...runs].reverse();
  const oldest = chronological[0]?.execution_date ?? chronological[0]?.logical_date ?? undefined;
  const { tis, total } = runs.length
    ? await client.queryTaskInstances({ dag_ids: [dagId], execution_date_gte: oldest ?? undefined }, { max: maxTis })
    : { tis: [] as TaskInstance[], total: 0 };
  const runIds = new Set(runs.map((r) => r.dag_run_id));
  const inScope = tis.filter((t) => runIds.has(t.dag_run_id));
  return {
    runs,
    chronological,
    tis: inScope,
    tisTotal: total,
    tisCapped: total > tis.length,
    runSummary: summarize(chronological.map(runSeconds).filter((x): x is number => x !== undefined)),
    health: runHealth(runs, inScope),
    tasks: taskStats(inScope),
  };
}
