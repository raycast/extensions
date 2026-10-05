export type SchedulerScope = "global" | "region" | "entity" | "async";
export type SchedulerTiming = "now" | "delayed" | "fixedRate";
export type AsyncTimeUnit = "MILLISECONDS" | "SECONDS" | "MINUTES";

export interface SchedulerBuilderInput {
  scope: SchedulerScope;
  timing: SchedulerTiming;
  pluginVariable: string;
  locationVariable: string;
  entityVariable: string;
  delay: string;
  period: string;
  asyncUnit: AsyncTimeUnit;
  withRetiredCallback: boolean;
}

function fallback(value: string, fallbackValue: string): string {
  return value.trim() || fallbackValue;
}

function accessor(scope: SchedulerScope, entityVariable: string): string {
  switch (scope) {
    case "global":
      return "Bukkit.getGlobalRegionScheduler()";
    case "region":
      return "Bukkit.getRegionScheduler()";
    case "entity":
      return `${entityVariable}.getScheduler()`;
    case "async":
      return "Bukkit.getAsyncScheduler()";
  }
}

// Every method name, parameter order and the fact that only EntityScheduler
// takes a "retired" callback and only AsyncScheduler takes a TimeUnit comes
// straight from the Folia Javadoc for these four interfaces — see
// SCHEDULER_APIS for the same signatures spelled out with commentary.
export function buildSchedulerCode(input: SchedulerBuilderInput): string {
  const plugin = fallback(input.pluginVariable, "plugin");
  const location = fallback(input.locationVariable, "location");
  const entity = fallback(input.entityVariable, "entity");
  const delay = fallback(input.delay, "20L");
  const period = fallback(input.period, "20L");

  const target = accessor(input.scope, entity);
  const locationArg = input.scope === "region" ? `${location}, ` : "";
  const retiredArg =
    input.scope === "entity" && input.withRetiredCallback
      ? ", () -> {\n        // runs instead, if the entity is gone before the task fires\n    }"
      : input.scope === "entity"
        ? ", null"
        : "";

  const body = "task -> {\n        // your code\n    }";

  if (input.scope === "async") {
    switch (input.timing) {
      case "now":
        return `${target}.runNow(${plugin}, ${body});`;
      case "delayed":
        return `${target}.runDelayed(${plugin}, ${body}, ${delay}, TimeUnit.${input.asyncUnit});`;
      case "fixedRate":
        return `${target}.runAtFixedRate(${plugin}, ${body}, ${delay}, ${period}, TimeUnit.${input.asyncUnit});`;
    }
  }

  switch (input.timing) {
    case "now":
      return `${target}.run(${plugin}, ${locationArg}${body}${retiredArg});`;
    case "delayed":
      return `${target}.runDelayed(${plugin}, ${locationArg}${body}${retiredArg}, ${delay});`;
    case "fixedRate":
      return `${target}.runAtFixedRate(${plugin}, ${locationArg}${body}${retiredArg}, ${delay}, ${period});`;
  }
}
