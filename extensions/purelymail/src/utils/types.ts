export type Domain = {
  name: string;
  allowAccountReset: boolean;
  symbolicSubaddressing: boolean;
  isShared: boolean;
  dnsSummary: {
    passesMx: boolean;
    passesSpf: boolean;
    passesDkim: boolean;
    passesDmarc: boolean;
  };
};
export type Rule = {
  id: number;
  domainName: string;
  prefix: boolean;
  matchUser: string;
  targetAddresses: string[];
  catchall: boolean;
};

// Request Body
export type CreateUserRequest = {
  userName: string;
  domainName: string;
  password: string;
  enablePasswordReset?: boolean;
  recoveryEmail?: string;
  recoveryEmailDescription?: string;
  recoveryPhone?: string;
  recoveryPhoneDescription?: string;
  enableSearchIndexing?: boolean;
  sendWelcomeEmail?: boolean;
};
export type DeleteUserRequest = {
  userName: string;
};
export type ModifyUserRequest = {
  userName: string;
  newUserName?: string;
  newPassword?: string;
  enableSearchIndexing?: boolean;
  enablePasswordReset?: boolean;
  requireTwoFactorAuthentication?: boolean;
};
export type CreateRoutingRequest = {
  domainName: string;
  prefix: boolean;
  matchUser: string;
  targetAddresses: string[];
  catchall: boolean;
};
type DeleteRoutingRequest = {
  routingRuleId: number;
};
export type AddDomainRequest = {
  domainName: string;
};
type ListDomainsRequest = {
  includeShared: boolean;
};
export type UpdateDomainSettingsRequest = {
  name: string;
  allowAccountReset: boolean;
  symbolicSubaddressing: boolean;
  recheckDns: boolean;
};
type DeleteDomainRequest = {
  name: string;
};

export type CreateAppPasswordRequest = {
  userHandle: string;
  name: string;
};
export type DeleteAppPasswordRequest = {
  userName: string;
  appPassword: string;
};

export type RequestBody =
  | CreateUserRequest
  | DeleteUserRequest
  | ModifyUserRequest
  | CreateRoutingRequest
  | DeleteRoutingRequest
  | AddDomainRequest
  | ListDomainsRequest
  | UpdateDomainSettingsRequest
  | DeleteDomainRequest
  | CreateAppPasswordRequest
  | DeleteAppPasswordRequest
  | Record<string, never>;

type SuccessResponse = {
  type: "success";
  result: {
    domains?: Domain[];
    rules?: Rule[];
    code?: string;
    credit?: string;
    appPassword?: string;
    users?: string[];
  };
};
export type ErrorResponse = {
  type: "error";
  code: string;
  message: string;
};
export type Response = SuccessResponse | ErrorResponse;
