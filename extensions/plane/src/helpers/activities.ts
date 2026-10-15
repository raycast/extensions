import type { RawActivity } from "../api/types";

export type NamedRef = { id: string; name: string };

/**
 * Derives the current cycle and modules of a work item from its activity log.
 * v1 work item responses carry no cycle/module field, and this costs one request
 * instead of scanning every cycle and module. Activities must be newest first.
 *
 * Event shapes (plane/bgtasks/issue_activities_task.py @ v1.3.1):
 * - cycles: verb created (new_identifier), updated (old→new), deleted (old_identifier)
 * - modules: verb created (new_identifier), deleted (old_identifier)
 */
export function deriveCycleAndModules(activitiesNewestFirst: RawActivity[]): {
  cycle?: NamedRef;
  modules: NamedRef[];
} {
  let cycle: NamedRef | undefined;
  const modules = new Map<string, NamedRef>();

  for (const activity of [...activitiesNewestFirst].reverse()) {
    if (activity.field === "cycles") {
      if (activity.verb === "deleted") {
        if (!cycle || !activity.old_identifier || cycle.id === activity.old_identifier) cycle = undefined;
      } else if (activity.new_identifier) {
        cycle = { id: activity.new_identifier, name: activity.new_value || "Cycle" };
      } else if (activity.verb === "updated") {
        cycle = undefined;
      }
    } else if (activity.field === "modules") {
      if (activity.old_identifier && (activity.verb === "deleted" || activity.verb === "updated")) {
        modules.delete(activity.old_identifier);
      }
      if (activity.new_identifier && activity.verb !== "deleted") {
        modules.set(activity.new_identifier, { id: activity.new_identifier, name: activity.new_value || "Module" });
      }
    }
  }

  return { cycle, modules: [...modules.values()] };
}
