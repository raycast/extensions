import { Optional } from "@/common/utils/optional-utils";

export const MonitorStatus = {
  UP: "up",
  DOWN: "down",
  PAUSED: "paused",
  PENDING: "pending",
  VALIDATING: "validating",
  MAINTENANCE: "maintenance",
} as const;

export type MonitorStatus = (typeof MonitorStatus)[keyof typeof MonitorStatus];

export interface Monitor {
  id: string;
  name: string;
  url: string;
  monitorType: Optional<string>;
  status: MonitorStatus;
  checkFrequency: Optional<number>;
  lastCheckedAt: Optional<string>;
  createdAt: Optional<string>;
  httpMethod: Optional<string>;
  requestTimeout: Optional<number>;
  recoveryPeriod: Optional<number>;
  regions: string[];
  sslExpiration: Optional<number>;
  domainExpiration: Optional<number>;
}
