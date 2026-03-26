import { AwsService, UsageMap } from "../types";

export function partitionByUsage(
  services: AwsService[],
  usage: UsageMap,
  recentLimit = 5,
): { recent: AwsService[]; all: AwsService[] } {
  const recent = services
    .filter((s) => usage[s.id])
    .sort((a, b) => usage[b.id]!.lastOpenedAt - usage[a.id]!.lastOpenedAt)
    .slice(0, recentLimit);

  const recentIds = new Set(recent.map((s) => s.id));
  const all = services.filter((s) => !recentIds.has(s.id));

  return { recent, all };
}
