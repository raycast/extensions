export type OutageDeckStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

export interface OutageDeckService {
  id: string;
  slug: string;
  name: string;
  status: OutageDeckStatus | string;
}

export interface OutageDeckIncident {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  status: string;
  severity: string;
  startedAt: string;
  updatedAt: string;
  affectedServices?: Array<{
    slug: string;
    name: string;
  }>;
}

export interface OutageDeckProviderResponse {
  data: {
    id: string;
    slug: string;
    name: string;
    currentStatus: {
      code: OutageDeckStatus | string;
      label: string;
      headline: string;
      summary: string;
      capturedAt: string;
    };
    services?: OutageDeckService[];
    activeIncidents?: OutageDeckIncident[];
    links?: {
      html?: string;
    };
  };
}
