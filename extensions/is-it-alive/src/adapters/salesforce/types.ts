export interface SalesforceInstance {
  key: string;
  location?: string;
  environment?: string;
  /** e.g. "OK", "MINOR_INCIDENT_CORE", "MAJOR_INCIDENT_NONCORE", "MAINTENANCE_CORE" */
  status: string;
  isActive: boolean;
  Services?: Array<{ key: string }>;
}

export interface SalesforceProduct {
  key: string;
  name?: string;
  altDisplayName?: string;
  isActive?: boolean;
}

export interface SalesforceIncidentImpact {
  id: number;
  startTime?: string | null;
  endTime?: string | null;
  type?: string;
  /** "minor" | "major" */
  severity?: string;
}

export interface SalesforceIncidentEvent {
  id: number;
  type?: string;
  message?: string;
  createdAt?: string;
}

export interface SalesforceIncident {
  id: number;
  /** "Active" | "Resolved" */
  status: string;
  /** e.g. "Degradation" | "Disruption" */
  type?: string;
  createdAt: string;
  updatedAt?: string;
  affectsAll?: boolean;
  instanceKeys: string[];
  serviceKeys?: string[];
  IncidentImpacts?: SalesforceIncidentImpact[];
  IncidentEvents?: SalesforceIncidentEvent[];
}
