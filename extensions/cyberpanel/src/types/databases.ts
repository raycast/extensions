export type Database = {
  id: number;
  dbName: string;
  dbUser: string;
};
export type ListDatabasesInDomainRequest = {
  databaseWebsite: string;
};
export type ListDatabasesInDomainResponse = {
  status: 1;
  fetchStatus: 1;
  error_message: "None";
  data: Database[] | string;
};

export type CreateDatabaseFormValues = {
  databaseWebsite: string;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
  webUserName: string;
};
export type CreateDatabaseRequest = CreateDatabaseFormValues;
export type CreateDatabaseResponse = {
  status: 1;
  createDBStatus: 1;
  error_message: "None";
};

export type DeleteDatabaseRequest = {
  dbName: string;
};
export type DeleteDatabaseResponse = {
  status: 1;
  deleteStatus: 1;
  error_message: "None";
};

export type DatabaseRequestBody = ListDatabasesInDomainRequest | CreateDatabaseRequest | DeleteDatabaseRequest;
export type DatabaseSuccessResponse = ListDatabasesInDomainResponse | CreateDatabaseResponse | DeleteDatabaseResponse;
