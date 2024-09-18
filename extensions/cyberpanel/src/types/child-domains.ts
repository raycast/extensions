import { CreateWebsiteFormValues, CreateWebsiteRequest, CreateWebsiteResponse } from "./websites";

export type ChildDomain = {
  childDomain: string;
  path: string;
  childLunch: string;
};
export type ListChildDomainsRequest = {
  masterDomain: string;
};
export type ListChildDomainsResponse = {
  status: 1;
  fetchStatus: 1;
  error_message: "None";
  data: ChildDomain[] | string;
};

export type CreateChildDomainFormValues = CreateWebsiteFormValues;
export type CreateChildDomainRequest = {
  masterDomain: string;
  path: string;
} & CreateWebsiteRequest;
export type CreateChildDomainResponse = {
  tempStatusPath?: string;
} & CreateWebsiteResponse;

export type DeleteChildDomainRequest = {
  websiteName: string;
};
export type DeleteChildDomainResponse = {
  status: 1;
  websiteDeleteStatus: 1;
  error_message: "None";
};

export type ChildDomainRequestBody = ListChildDomainsRequest | CreateChildDomainRequest | DeleteChildDomainRequest;
export type ChildDomainSuccessResponse =
  | ListChildDomainsResponse
  | CreateChildDomainResponse
  | DeleteChildDomainResponse;
