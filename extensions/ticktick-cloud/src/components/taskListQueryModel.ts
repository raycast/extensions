import type { TaskViewQuery } from "../application/viewQuery";
import type { TaskCommandConfig } from "../commands/taskCommandConfigs";
import { ProtocolError } from "../domain/errors";

export interface StableTaskQueryCapabilities {
  readonly completedQuery: boolean;
}

export function buildStableTaskQuery(
  config: TaskCommandConfig,
  capabilities: StableTaskQueryCapabilities
): Readonly<TaskViewQuery> {
  const runtimeConfig: unknown = config;
  if (!isRecord(runtimeConfig) || !isRecord(runtimeConfig.query)) return invalidConfig();

  const view = runtimeConfig.query.view;
  if (view === "search") {
    return Object.freeze({ view, status: capabilities.completedQuery === true ? "all" : "open" });
  }

  const status = runtimeConfig.query.status;
  if ((view === "today" || view === "next7Days" || view === "inbox") && status === "open") {
    return Object.freeze({ view, status: "open" });
  }

  return invalidConfig();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidConfig(): never {
  throw new ProtocolError("The task command configuration is invalid.");
}
