import { StatusIndicator } from "@/types";

export interface StatuspageSummary {
  page: { name: string; url: string };
  status: { indicator: StatusIndicator; description: string };
  components: Array<{
    id: string;
    name: string;
    status: string;
    group?: boolean;
  }>;
  incidents?: Array<{
    id: string;
    name: string;
    status: string;
    impact: string;
    updated_at: string;
    incident_updates?: Array<{
      body: string;
      affected_components?: Array<{ code: string }>;
    }>;
    components?: Array<{ id: string }>;
  }>;
}

export interface StatuspageIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  updated_at: string;
  created_at: string;
  resolved_at: string | null;
  incident_updates?: Array<{
    body: string;
    affected_components?: Array<{ code: string }>;
  }>;
  components?: Array<{ id: string }>;
}

/**
 * Outage keys are seconds spent in that status: `m` major, `p` partial,
 * `d` degraded.
 */
export interface StatuspageUptimeDay {
  date: string;
  outages?: Partial<Record<"m" | "p" | "d", number>>;
  related_events?: Array<{ name: string; code: string }>;
}

/** `/uptime_showcase?components=a,b` response, keyed by component id. */
export interface StatuspageUptimeShowcase {
  timelines?: Record<
    string,
    {
      component: { code: string; name: string; startDate?: string };
      days: StatuspageUptimeDay[];
    }
  >;
  values?: Array<{
    component: string;
    ninety: number;
    sixty: number;
    thirty: number;
  }>;
}

export interface StatuspageComponentUptime {
  days: StatuspageUptimeDay[];
  uptimePercent?: number;
}
