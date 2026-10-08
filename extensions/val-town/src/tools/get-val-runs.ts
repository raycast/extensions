import { getLogs, getTraces, listFiles } from "../lib/api";
import { requireAllowed } from "../lib/allowed";
import { pickEntrypoint } from "../lib/schema";
import { readValConfig } from "../lib/valconfig";

type Input = {
  /** The val as `handle/valName`, exactly as list-tools returned it. */
  val: string;
  /** Which file's runs to read. Omit for the file the val is called at. */
  path?: string;
};

/** Val Town only keeps one hour of traces and logs, so absence means quiet, not healthy. */
export default async function getValRuns(input: Input) {
  await requireAllowed(input.val);

  const [{ files }, config] = await Promise.all([listFiles(input.val), readValConfig(input.val).catch(() => null)]);
  const target = input.path
    ? files.find((file) => file.path === input.path)
    : (files.find((file) => file.path === config?.entrypoint) ?? pickEntrypoint(files));
  if (!target) throw new Error(`${input.val} has no file at ${input.path ?? "its entrypoint"}.`);

  const traces = await getTraces(target.id);
  const recent = traces.traces.slice(0, 10);

  // One logs call covers every listed run; fetching per trace would be a call per row.
  const logs = recent.length > 0 ? await getLogs(target.id, { traceIds: recent.map((trace) => trace.traceId) }) : null;

  return {
    val: input.val,
    path: target.path,
    windowIsOneHour: true,
    runs: recent.map((trace) => ({
      status: trace.status,
      startedAt: trace.startTime,
      durationMs: trace.durationMs,
      error: trace.error ?? null,
      httpStatus: trace.httpStatus ?? null,
      logs: (logs?.logs ?? [])
        .filter((line) => line.traceId === trace.traceId)
        .map((line) => `[${line.level}] ${line.body}`.slice(0, 500)),
    })),
    note:
      recent.length === 0
        ? "No runs in the last hour. Val Town keeps no history beyond that, so older runs are unknowable."
        : undefined,
  };
}
