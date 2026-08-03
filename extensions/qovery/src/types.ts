export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  icon_uri?: string;
  service_type: string;
  project_id: string;
  project_name: string;
  environment_id: string;
  environment_name: string;
  organization_id: string;
  organization_name: string;
}

export interface ServiceLink {
  url: string;
}
