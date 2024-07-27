/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthFields, ScratchOrgInfo } from "@salesforce/core";

export type OrgDisplayReturn = Partial<ScratchOrgFields> & {
  username: string;
  id: string;
  accessToken: string;
  instanceUrl: string;
  clientId: string;
  apiVersion?: string;

  alias?: string;
  password?: string;

  // non-scratch orgs
  connectedStatus?: string;
  sfdxAuthUrl?: string;
};

/** Convenience type for the fields that are in the auth file
 *
 * core's AuthFields has everything as optional.
 *
 * In this case, we have a username because these come from auth files */
export type AuthFieldsFromFS = Omit<AuthFields, "expirationDate"> & {
  username: string;
  orgId: string;
  accessToken: string;
  instanceUrl: string;
  clientId: string;
  string: string;
};

export type ExtendedAuthFields = AuthFieldsFromFS & OrgListFields;

export type ExtendedAuthFieldsScratch = ExtendedAuthFields & {
  expirationDate: string;
  devHubUsername: string;
  devHubOrgId?: string;
};

export type FullyPopulatedScratchOrgFields = ScratchOrgFields &
  ExtendedAuthFieldsScratch & {
    isExpired: boolean;
  };

// developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_scratchorginfo.htm
export type ScratchOrgInfoSObject = {
  CreatedDate: string;
  Status: "New" | "Deleted" | "Active" | "Error";
  ExpirationDate: string;
  CreatedBy: {
    Username: string;
  };
  Edition: string;
  Namespace?: string;
  OrgName: string;
  SignupUsername: string;
};

/** fields in the  */
export type ScratchOrgFields = {
  createdBy: string;
  createdDate: string;
  expirationDate: string;
  orgName: string;
  status: string;
  devHubId: string;
  edition?: string;
  namespace?: string;
  snapshot?: string;
  lastUsed?: Date;
  signupUsername: string;
};

export type OrgListFields = {
  connectedStatus?: string;
  isDefaultUsername?: boolean;
  isDefaultDevHubUsername?: boolean;
  defaultMarker?: "(D)" | "(U)";
  attributes?: Record<string, unknown>;
  lastUsed?: Date;
};

/** If the scratch org is resumed, but doesn't get very far in the process, it won't have much information on it */
export type ScratchCreateResponse = {
  username?: string;
  scratchOrgInfo?: ScratchOrgInfo;
  authFields?: AuthFields;
  warnings: string[];
  orgId?: string;
};

export enum SandboxLicenseType {
  developer = "Developer",
  developerPro = "Developer_Pro",
  partial = "Partial",
  full = "Full",
}
