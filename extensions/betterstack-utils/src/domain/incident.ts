import { Optional } from "@/common/utils/optional-utils";

export const IncidentStatus = {
  Started: "Started",
  Acknowledged: "Acknowledged",
  Resolved: "Resolved",
} as const;

export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export interface Incident {
  id: string;
  name: string;
  summary: Optional<string>;
  cause: Optional<string>;
  status: IncidentStatus;
  startedAt: string;
  acknowledgedBy: Optional<string>;
  resolvedBy: Optional<string>;
}
