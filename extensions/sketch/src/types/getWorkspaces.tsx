import { Avatar } from "./sketch";

export interface GetWorkspacesBodyRes {
  data: Data;
}
export interface Data {
  me: Me;
}
export interface Me {
  __typename: string;
  identifier: string;
  personalWorkspace: PersonalWorkspace;
  workspaces?: WorkspacesEntity[] | null;
}
export interface PersonalWorkspace {
  __typename: string;
  avatar?: null;
  customer?: null;
  identifier: string;
  name: string;
  status: string;
  type: string;
  userCanEdit: boolean;
  userIsOwner: boolean;
  userRole: string;
}
export interface WorkspacesEntity {
  __typename: string;
  avatar: Avatar;
  customer: Customer;
  identifier: string;
  name: string;
  status: string;
  type: string;
  userCanEdit: boolean;
  userIsOwner: boolean;
  userRole: string;
}
export interface Customer {
  __typename: string;
  billing: Billing;
  identifier: string;
  ssoEnabled: boolean;
  ssoStartUrl?: null;
  tosAgreed: boolean;
}
export interface Billing {
  __typename: string;
  status: string;
}
