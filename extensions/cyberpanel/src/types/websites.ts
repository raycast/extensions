export type Website = {
  domain: string;
  adminEmail: string;
  ipAddress: string;
  admin: string;
  package: string;
  state: string;
  diskUsed: string;
};
export type ListWebsitesRequest = {
  page: number;
};
export type ListWebsitesResponse = {
  status: 1;
  listWebSiteStatus: 1;
  error_message: "None";
  data: Website[] | string;
  pagination: string;
};

export type CreateWebsiteFormValues = {
  domainName: string;
  package: string;
  adminEmail: string;
  phpSelection: string;
  websiteOwner: string;
  ssl: boolean;
  dkimCheck: boolean;
  openBasedir: boolean;
};
export type CreateWebsiteRequest = {
  domainName: string;
  package: string;
  adminEmail: string;
  phpSelection: string;
  websiteOwner: string;
  ssl: number;
  dkimCheck: number;
  openBasedir: number;
};
export type CreateWebsiteResponse = {
  status: 1;
  createWeSiteStatus: 1;
  error_message: "None";
};

export type DeleteWebsiteRequest = {
  websiteName: string;
};
export type DeleteWebsiteResponse = {
  status: 1;
  websiteDeleteStatus: 1;
  error_message: "None";
};

export type ChangeWebsitePHPVersionRequest = {
  childDomain: string;
  phpSelection: string;
};
export type ChangeWebsitePHPVersionResponse = {
  status: 1;
  error_message: "None";
};

export type ChangeWebsiteLinuxUserPasswordRequest = {
  domain: string;
  password: string;
};
export type ChangeWebsiteLinuxUserPasswordResponse = {
  status: 1;
  installStatus: 1;
  error_message: "None";
};

export type WebsiteRequestBody =
  | ListWebsitesRequest
  | CreateWebsiteRequest
  | DeleteWebsiteRequest
  | ChangeWebsitePHPVersionRequest
  | ChangeWebsiteLinuxUserPasswordRequest;
export type WebsiteSuccessResponse =
  | ListWebsitesResponse
  | CreateWebsiteResponse
  | DeleteWebsiteResponse
  | ChangeWebsitePHPVersionResponse
  | ChangeWebsiteLinuxUserPasswordResponse;
