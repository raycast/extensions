export type InstatusPageStatus = "UP" | "HASISSUES" | "UNDERMAINTENANCE";

export type InstatusComponentStatus =
  | "OPERATIONAL"
  | "UNDERMAINTENANCE"
  | "DEGRADEDPERFORMANCE"
  | "PARTIALOUTAGE"
  | "MAJOROUTAGE";

export interface InstatusSummaryIncident {
  id?: string;
  name: string;
  started: string;
  status: string;
  impact: string;
  url?: string;
  updatedAt?: string;
}

export interface InstatusSummaryMaintenance {
  id?: string;
  name: string;
  start: string;
  status: string;
  duration?: string;
  url?: string;
  updatedAt?: string;
}

export interface InstatusSummary {
  page: {
    name: string;
    url?: string;
    status: InstatusPageStatus | string;
  };
  activeIncidents?: InstatusSummaryIncident[];
  activeMaintenances?: InstatusSummaryMaintenance[];
}

export interface InstatusComponent {
  id: string;
  name: string;
  description?: string;
  status: InstatusComponentStatus | string;
  group: { id: string; name: string; description?: string } | null;
  activeIncidents?: InstatusSummaryIncident[];
}

export interface InstatusComponentsResponse {
  components: InstatusComponent[];
}

export interface InstatusOutage {
  from: string;
  to?: string | null;
  status: InstatusComponentStatus | string;
  noticeId?: string;
}

export interface InstatusComponentUptime {
  uptime?: string;
  outages?: InstatusOutage[];
}

export type InstatusComponentsUptime = Record<
  string,
  InstatusComponentUptime | undefined
>;
