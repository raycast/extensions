export type EmailAccount = {
  id: number;
  email: string;
  DiskUsage: string;
};
export type ListEmailAccountsInDomainRequest = {
  domain: string;
};
export type ListEmailAccountsInDomainResponse = {
  status: 1;
  fetchStatus: 1;
  error_message: "None";
  data: EmailAccount[] | string;
};

export type CreateEmailAccountFormValues = {
  domain: string;
  username: string;
  passwordByPass: string;
};
export type CreateEmailAccountRequest = CreateEmailAccountFormValues;
export type CreateEmailAccountResponse = {
  status: 1;
  createEmailStatus: 1;
  error_message: "None";
};

export type DeleteEmailAccountRequest = {
  email: string;
};
export type DeleteEmailAccountResponse = {
  status: 1;
  deleteEmailStatus: 1;
  error_message: "None";
};

export type EmailAccountRequestBody =
  | ListEmailAccountsInDomainRequest
  | CreateEmailAccountRequest
  | DeleteEmailAccountRequest;
export type EmailAccountSuccessResponse =
  | ListEmailAccountsInDomainResponse
  | CreateEmailAccountResponse
  | DeleteEmailAccountResponse;
