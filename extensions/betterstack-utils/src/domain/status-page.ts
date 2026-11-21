import { Optional } from "@/common/utils/optional-utils";

export const StatusPageState = {
  OPERATIONAL: "operational",
  DEGRADED: "degraded",
  DOWNTIME: "downtime",
  MAINTENANCE: "maintenance",
} as const;

export type StatusPageState = (typeof StatusPageState)[keyof typeof StatusPageState];

export interface StatusPage {
  id: string;
  name: string;
  subdomain: string;
  customDomain: Optional<string>;
  state: StatusPageState;
}
