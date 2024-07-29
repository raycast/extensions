import { Color } from "@raycast/api";

export interface AuthenticateNewOrgFormData {
  type: string;
  url?: string;
  alias: string;
  label: string;
  color: Color.Raw;
  section: string;
  newSectionName?: string;
}

export interface LocalStore {
  orgs: DeveloperOrg[];
  sfPath: string;
}

export interface DeveloperOrg {
  username: string;
  alias: string;
  label?: string;
  color?: Color.Raw;
  instanceUrl: string;
  section?: string;
}
