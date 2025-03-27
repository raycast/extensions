import { Color } from "@raycast/api";

export enum OrgListReducerType {
  SET_ORGS,
  ADD_ORG,
  DELETE_ORG,
  UPDATE_ORG,
}
export type OrgListReducerAction = {
  type: OrgListReducerType;
  setOrgs?: DeveloperOrg[];
  newOrg?: DeveloperOrg;
  updatedOrg?: DeveloperOrg;
  deletedOrg?: DeveloperOrg;
};

export interface AuthenticateNewOrgFormData {
  type: string;
  url?: string;
  alias: string;
  label: string;
  color: Color.Raw;
  section: string;
  newSectionName?: string;
  openToPath: string;
  customPath?: string;
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
  openToPath?: string;
  lastViewedAt?: number;
  expirationDate?: string;
}
