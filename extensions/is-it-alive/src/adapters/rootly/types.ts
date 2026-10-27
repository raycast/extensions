/** Rootly status page public API, `/api/v1/status.json` on the custom domain. */
export interface RootlyStatusResponse {
  page: { name: string; url: string };
  status: {
    /** Documented: "none" | "minor" | "major" | "maintenance". */
    indicator: string;
    description: string;
  };
  incidents?: RootlyIncident[];
}

export interface RootlyIncident {
  name: string;
  status: string;
  impact: string;
  started_at: string;
  resolved_at: string | null;
  url: string;
  incident_updates?: Array<{
    body: string;
    status: string;
    created_at: string;
  }>;
}
