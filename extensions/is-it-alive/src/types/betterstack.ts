export type BetterStackAggregateState =
  | "operational"
  | "degraded"
  | "downtime"
  | "maintenance"
  | "resolved";

export type BetterStackResourceStatus =
  | "operational"
  | "degraded"
  | "downtime"
  | "maintenance"
  | "not_monitored";

export type BetterStackReportType = "manual" | "automatic" | "maintenance";

export interface BetterStackStatusHistoryDay {
  day: string;
  status: BetterStackResourceStatus;
  downtime_duration: number;
  maintenance_duration: number;
}

export interface BetterStackAffectedResource {
  status_page_resource_id: string;
  status: BetterStackResourceStatus | "resolved";
}

export interface BetterStackIndexResponse {
  data: {
    id: string;
    type: "status_page";
    attributes: {
      company_name: string;
      company_url: string | null;
      contact_url: string | null;
      logo_url: string | null;
      timezone: string;
      subdomain: string;
      custom_domain: string | null;
      announcement: string | null;
      aggregate_state: BetterStackAggregateState;
      created_at: string;
      updated_at: string;
    };
    relationships: {
      sections: { data: Array<{ id: string; type: "status_page_section" }> };
      resources: { data: Array<{ id: string; type: "status_page_resource" }> };
      status_reports: { data: Array<{ id: string; type: "status_report" }> };
    };
  };
  included: BetterStackIncludedItem[];
}

export type BetterStackIncludedItem =
  | {
      id: string;
      type: "status_page_section";
      attributes: {
        name: string;
        position: number;
      };
    }
  | {
      id: string;
      type: "status_page_resource";
      attributes: {
        status_page_section_id: number;
        resource_id: number;
        resource_type: string;
        public_name: string;
        explanation: string;
        position: number;
        availability: number;
        status: BetterStackResourceStatus;
        status_history: BetterStackStatusHistoryDay[];
      };
    }
  | {
      id: string;
      type: "status_report";
      attributes: {
        title: string;
        report_type: BetterStackReportType;
        starts_at: string;
        ends_at: string | null;
        affected_resources: BetterStackAffectedResource[];
        aggregate_state: BetterStackAggregateState;
      };
      relationships: {
        status_updates: {
          data: Array<{ id: string; type: "status_update" }>;
        };
      };
    }
  | {
      id: string;
      type: "status_update";
      attributes: {
        message: string;
        published_at: string;
        published_at_timezone: string;
        notify_subscribers: boolean;
        affected_resources: BetterStackAffectedResource[];
      };
    };
