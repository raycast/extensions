/**
 * AWS Health Dashboard event status codes (shared by events and log entries):
 * "0" = resolved, "1" = impacted/informational, "2" = degraded, "3" = disrupted.
 */
export type AwsEventStatus = "0" | "1" | "2" | "3";

export interface AwsEventLogEntry {
  summary?: string;
  message: string;
  status: AwsEventStatus | string | number;
  timestamp: number;
}

export interface AwsCurrentEvent {
  date: string;
  arn: string;
  region_name?: string;
  status: AwsEventStatus | string;
  /** Service-region key, e.g. "ec2-us-east-1". */
  service?: string;
  service_name?: string;
  summary: string;
  event_log?: AwsEventLogEntry[];
}

export interface AwsHistoryEvent {
  summary: string;
  arn: string;
  status: AwsEventStatus | string;
  date: string;
  event_log?: AwsEventLogEntry[];
}

/** Keyed by service-region, e.g. "ec2-us-east-1" or "route53". */
export type AwsHistoryEvents = Record<string, AwsHistoryEvent[]>;
