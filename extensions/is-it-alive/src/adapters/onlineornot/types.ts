export type OnlineOrNotComponentStatus =
  | "OPERATIONAL"
  | "DEGRADED_PERFORMANCE"
  | "PARTIAL_OUTAGE"
  | "MAJOR_OUTAGE"
  | "UNDER_MAINTENANCE";

export interface OnlineOrNotStatusPage {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
}

export interface OnlineOrNotComponent {
  id: string;
  name: string;
  status: OnlineOrNotComponentStatus | string;
}

export interface OnlineOrNotIncident {
  id: string;
  title: string;
  impact?: string | null;
  started: string;
  ended?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OnlineOrNotSummary {
  success: boolean;
  result: {
    status?: {
      description?: string;
    };
    status_page: OnlineOrNotStatusPage;
    components?: OnlineOrNotComponent[];
    active_incidents?: OnlineOrNotIncident[];
    scheduled_maintenance?: OnlineOrNotIncident[];
  };
}
