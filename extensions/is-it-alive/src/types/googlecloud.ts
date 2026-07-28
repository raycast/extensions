export interface GoogleCloudProduct {
  title: string;
  id: string;
}

export interface GoogleCloudProductsResponse {
  products: GoogleCloudProduct[];
}

export interface GoogleCloudIncidentUpdate {
  created?: string;
  modified?: string;
  when?: string;
  text?: string;
}

export interface GoogleCloudIncident {
  id: string;
  number?: string;
  begin: string;
  /** Missing or empty while the incident is still active. */
  end?: string | null;
  created?: string;
  modified?: string;
  /** "low" | "medium" | "high" */
  severity?: string;
  /** "SERVICE_OUTAGE" | "SERVICE_DISRUPTION" | "SERVICE_INFORMATION" */
  status_impact?: string;
  external_desc?: string;
  uri?: string;
  affected_products?: GoogleCloudProduct[];
  currently_affected_locations?: Array<{ title: string; id: string }>;
  previously_affected_locations?: Array<{ title: string; id: string }>;
  most_recent_update?: GoogleCloudIncidentUpdate;
  updates?: GoogleCloudIncidentUpdate[];
}
