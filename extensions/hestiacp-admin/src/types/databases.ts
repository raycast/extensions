export type ListDatabasesResponse = {
  [key: string]: {
    DATABASE: string;
    DBUSER: string;
    HOST: string;
    TYPE: string;
    CHARSET: string;
    U_DISK: string;
    SUSPENDED: "yes" | "no";
    TIME: string;
    DATE: string;
  };
};

export type AddDatabaseRequest = {
  user: string;
  database: string;
  db_user: string;
  db_pass: string;
  // type: string;
  // host: string;
  // charset: string;
};
export type AddDatabaseFormValues = AddDatabaseRequest;
