import type { Intent, Tuning } from "./intent";

export const HELPER_PROTOCOL = 9;

/** The Swift `run(...)` parameters, in declaration order: the generated main reads them positionally. */
export const RUN_PARAMETERS = ["level", "state", "levels", "externalMax", "strategy", "lowBattery"] as const;

/** argv after the binary: the function name, then each argument JSON-encoded. The state path lands at argv[3]. */
export function runArgs(intent: Intent, statePath: string, tuning: Tuning): string[] {
  const values: Record<(typeof RUN_PARAMETERS)[number], unknown> = {
    level: intent.all,
    state: statePath,
    levels: intent.levels,
    externalMax: tuning.externalMax,
    strategy: tuning.strategy,
    lowBattery: tuning.lowBattery,
  };
  return ["run", ...RUN_PARAMETERS.map((name) => JSON.stringify(values[name]))];
}
