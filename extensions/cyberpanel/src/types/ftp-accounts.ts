export type FTPAccount = {
  dir: string;
  id: number;
  quotasize: string;
  user: string;
};
export type ListFTPAccountsInDomainRequest = {
  selectedDomain: string;
};
export type ListFTPAccountsInDomainResponse = {
  status: 1;
  fetchStatus: 1;
  error_message: "None";
  data: FTPAccount[] | string;
};

export type CreateFTPAccountFormValues = {
  ftpDomain: string;
  ftpUserName: string;
  passwordByPass: string;
  path: string;
};
export type CreateFTPAccountRequest = CreateFTPAccountFormValues;
export type CreateFTPAccountResponse = {
  status: 1;
  createFTPStatus: 1;
  error_message: "None";
};

export type DeleteFTPAccountRequest = {
  ftpUsername: string;
};
export type DeleteFTPAccountResponse = {
  status: 1;
  deleteStatus: 1;
  error_message: "None";
};

export type FTPAccountRequestBody = ListFTPAccountsInDomainRequest | CreateFTPAccountRequest | DeleteFTPAccountRequest;
export type FTPAccountSuccessResponse =
  | ListFTPAccountsInDomainResponse
  | CreateFTPAccountResponse
  | DeleteFTPAccountResponse;
