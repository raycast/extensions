import type { ComponentStatus, Health, Incident } from "./types";

const HEALTH_RANK: Record<Exclude<Health, "unknown">, number> = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  partial_outage: 3,
  major_outage: 4,
};

export function highestHealth(values: readonly Health[]): Health {
  let highest: Exclude<Health, "unknown"> | undefined;

  for (const value of values) {
    if (value === "unknown") continue;
    if (highest === undefined || HEALTH_RANK[value] > HEALTH_RANK[highest]) highest = value;
  }

  return highest ?? "unknown";
}

export function deriveProviderHealth(
  reportedHealth: Health,
  components: readonly ComponentStatus[],
  incidents: readonly Incident[],
): Health {
  if (reportedHealth !== "unknown") return reportedHealth;

  const activeIncidentHealth = incidents
    .filter((incident) => incident.state !== "resolved")
    .map((incident) => (incident.state === "scheduled" ? "maintenance" : incident.health));

  return highestHealth([...components.map((component) => component.health), ...activeIncidentHealth]);
}

export function isIssue(health: Health): boolean {
  return health === "degraded" || health === "partial_outage" || health === "major_outage";
}
