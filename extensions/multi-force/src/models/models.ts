export interface AuthenticateNewOrgFormData {
  type: string;
  url?: string;
  alias: string;
  label: string;
}

export interface LocalStore {
  orgs: DeveloperOrg[];
  sfPath: string;
}

export interface DeveloperOrg {
  username: string;
  alias: string;
}
