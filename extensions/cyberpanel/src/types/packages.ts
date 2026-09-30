export type Package = {
  packageName: string;
  allowedDomains: number;
  diskSpace: number;
  bandwidth: number;
  emailAccounts: number;
  dataBases: number;
  ftpAccounts: number;
};
export type ListPackagsResponse = {
  status: 1;
  error_message: "None";
  data: Package[] | string;
};

export type CreatePackageFormValues = {
  packageName: string;
  diskSpace: string;
  bandwidth: string;
  dataBases: string;
  ftpAccounts: string;
  emails: string;
  allowedDomains: string;
  api: boolean;
  allowFullDomain: boolean;
};
export type CreatePackageRequest = {
  packageName: string;
  diskSpace: string;
  bandwidth: string;
  dataBases: string;
  ftpAccounts: string;
  emails: string;
  allowedDomains: string;
  api: string;
  allowFullDomain: string;
};
export type CreatePackageResponse = {
  status: 1;
  createStatus: 1;
  error_message: "None";
};

export type ModifyPackageFormValues = {
  diskSpace: string;
  bandwidth: string;
  dataBases: string;
  ftpAccounts: string;
  emails: string;
  allowedDomains: string;
  api: boolean;
  allowFullDomain: boolean;
};
export type ModifyPackageRequest = {
  packageName: string;
  diskSpace: number;
  bandwidth: number;
  dataBases: number;
  ftpAccounts: number;
  emails: number;
  allowedDomains: number;
  api: number;
  allowFullDomain: number;
};
export type ModifyPackageResponse = {
  status: 1;
  saveStatus: 1;
  error_message: "None";
};

export type DeletePackageRequest = {
  packageName: string;
};
export type DeletePackageResponse = {
  status: 1;
  deleteStatus: 1;
  error_message: "None";
};

export type PackageRequestBody = DeletePackageRequest | CreatePackageRequest | ModifyPackageRequest;
export type PackageSuccessResponse =
  | ListPackagsResponse
  | DeletePackageResponse
  | CreatePackageResponse
  | ModifyPackageResponse;
