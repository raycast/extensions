type ListResponse = {
  list: string[];
};

//
export type GetUserUsageResponse = {
  bandwidth: string;
  db_quota: string;
  quota: string;
  domainptr: string;
  email_deliveries: string;
  email_deliveries_incoming: string;
  email_deliveries_outgoing: string;
  email_quota: string;
  ftp: string;
  inode: string;
  mysql: string;
  nemailf: string;
  nemailml: string;
  nemailr: string;
  nemails: string;
  nsubdomains: string;
  other_quota: string;
  quota_without_system: string;
  vdomains: string;
};
export type GetUserConfigResponse = {
  account: boolean;
  additional_bandwidth: string;
  aftp: boolean;
  apiAllowPassword: boolean;
  bandwidth: string;
  catchall: string;
  cgi: boolean;
  clamav: string;
  creator: string;
  cron: boolean;
  date_created: string;
  demo: string;
  dnscontrol: boolean;
  docsroot: string;
  domain: string;
  domainptr: string;
  email: string;
  email_limit: string;
  ftp: string;
  git: string;
  inode: string;
  ip: string;
  ips: string;
  language: string;
  login_keys: string;
  mysql: string;
  name: string;
  nemailf: string;
  nemailml: string;
  nemailr: string;
  nemails: string;
  notify_on_all_question_failures: string;
  notify_on_all_twostep_auth_failures: string;
  ns1: string;
  ns2: string;
  nsubdomains: string;
  original_package: string;
  package: string;
  php: string;
  quota: string;
  security_questions: string;
  skin: string;
  spam: string;
  ssh: string;
  ssl: string;
  suspend_at_limit: string;
  suspended: string;
  sysinfo: string;
  twostep_auth: string;
  user_widgets: string;
  username: string;
  usertype: string;
  vdomains: string;
  wordpress: boolean;
  zoom: string;
  users: string[];
  domains: string[];
};
export type GetUserDomainsResponse = {
  [key: string]: {
    bandwidth_used: string;
    bandwidth_limit: string;
    disk_usage: string;
    log_usage: string;
    subdomains: string;
    suspended: string;
    quote: string;
    ssl: string;
    cgi: string;
    php: string;
  };
};

export type CreateUserFormValues = {
  username: string;
  email: string;
  passwd: string;
  passwd2: string;
  domain: string;
  package: string;
  ip: string;
  notify: boolean;
};
export type CreateUserRequest = {
  action: "create";
  add: "Submit";
  username: string;
  email: string;
  passwd: string;
  passwd2: string;
  domain: string;
  package: string;
  ip: string;
  notify: "yes" | "no";
};
export type DeleteUserRequest = {
  confirmed: "Confirm";
  delete: "yes";
  select0: string;
};
export type SuspendOrUnsuspendUserRequest = {
  // dosuspend?: any;
  // dounsuspend?: any;
  dosuspend?: boolean;
  dounsuspend?: boolean;
  select0: string;
};
export type ModifyUserFormValues = {
  bandwidth: string;
  ubandwidth: boolean;
  quota: string;
  uquota: boolean;
  vdomains: string;
  uvdomains: boolean;
  nsubdomains: string;
  unsubdomains: boolean;
  nemails: string;
  unemails: boolean;
  nemailf: string;
  unemailf: boolean;
  nemailml: string;
  unemailml: boolean;
  nemailr: string;
  unemailr: boolean;
  mysql: string;
  umysql: boolean;
  domainptr: string;
  udomainptr: boolean;
  ftp: string;
  uftp: boolean;
  aftp: boolean;
  cgi: boolean;
  php: boolean;
  spam: boolean;
  cron: boolean;
  ssl: boolean;
  sysinfo: boolean;
  ssh: boolean;
  dnscontrol: boolean;
  skin: string;
  ns1: string;
  ns2: string;
};
export type ModifyUserRequest = {
  action: "customize";
  user: string;
  bandwidth: number;
  ubandwidth: "ON" | "OFF";
  quota: number;
  uquota: "ON" | "OFF";
  vdomains: number;
  uvdomains: "ON" | "OFF";
  nsubdomains: number;
  unsubdomains: "ON" | "OFF";
  nemails: number;
  unemails: "ON" | "OFF";
  nemailf: number;
  unemailf: "ON" | "OFF";
  nemailml: number;
  unemailml: "ON" | "OFF";
  nemailr: number;
  unemailr: "ON" | "OFF";
  mysql: number;
  umysql: "ON" | "OFF";
  domainptr: number;
  udomainptr: "ON" | "OFF";
  ftp: number;
  uftp: "ON" | "OFF";
  aftp: "ON" | "OFF";
  cgi: "ON" | "OFF";
  php: "ON" | "OFF";
  spam: "ON" | "OFF";
  cron: "ON" | "OFF";
  ssl: "ON" | "OFF";
  sysinfo: "ON" | "OFF";
  ssh: "ON" | "OFF";
  dnscontrol: "ON" | "OFF";
  skin: string;
  ns1: string;
  ns2: string;
};
export type ChangeUserAccountEmailRequest = {
  evalue: string;
  domain?: string;
  email: "Save";
};
export type ChangeUserTicketingEmailRequest = {
  email: string;
  ON: "yes" | "no";
  save?: "Save";
};
export type ChangeUserTicketingEmailFormValues = {
  email: string;
  ON: boolean;
};

//
export type GetResellerIPsResponse = ListResponse;
export type GetResellerIPInformationResponse = {
  gateway: string;
  global: "yes" | "no";
  netmask: string;
  ns: string;
  reseller: string;
  status: string;
  value: string;
};

export type GetResellerUserAccountsResponse = ListResponse;

// PACKAGES
export type GetUserPackagesResponse = ListResponse;
export type GetUserPackageInformationResponse = {
  aftp: "OFF" | "ON";
  bandwidth: "OFF" | "ON";
  catchall: "OFF" | "ON";
  cgi: string;
  cron: string;
  dnscontrol: "OFF" | "ON";
  domainptr: string;
  ftp: string;
  inode: string;
  language: string;
  login_keys: "OFF" | "ON";
  mysql: string;
  nemailf: string;
  nemailml: string;
  nemailr: string;
  nemails: string;
  nsubdomains: string;
  php: "OFF" | "ON";
  quota: string;
  skin: string;
  spam: string;
  ssh: string;
  ssl: string;
  suspend_at_limit: "OFF" | "ON";
  sysinfo: string;
  vdomains: string;
};

// DOMAINS
export type CreateNewDomainFormValues = {
  domain: string;
  bandwidth?: string;
  ubandwidth?: boolean;
  quota?: string;
  uquota?: boolean;
  ssl: boolean;
  cgi: boolean;
  php: boolean;
};
export type CreateNewDomainRequest = {
  action: "create";
  domain: string;
  bandwidth?: string;
  ubandwidth?: boolean;
  quota?: string;
  uquota?: boolean;
  ssl: "ON" | "OFF";
  cgi: "ON" | "OFF";
  php: "ON" | "OFF";
};
export type CreateSubdomainFormValues = {
  subdomain: string;
};
export type CreateSubdomainRequest = {
  action: "create";
  domain: string;
  subdomain: string;
};
export type DeleteSubdomainRequest = {
  action: "delete";
  domain: string;
  select0: string;
  contents: "yes" | "no";
};

// DATABASES
export type GetDatabasesResponse = Array<{
  database: string;
  sizeBytes: number;
  userCount: number;
  tableCount: number;
  definerIssues: number;
}>;
export type CreateDatabaseRequest = {
  action: "create";
  name: string;
  user: string;
  passwd: string;
  passwd2: string;
};
export type DeleteDatabaseRequest = {
  action: "delete";
  select0: string;
};

// SESSION
export type GetSessionRequest = {
  ip: string;
  session_id: string;
};
export type GetSessionResponse = {
  error: "0";
  password: string;
  username: string;
  usertype: "user" | "reseller" | "admin";
};

// EMAILS
export type GetEmailAccountsRequest = {
  action: "list";
  domain: string;
};
export type GetEmailAccountsResponse = ListResponse;
export type ChangeEmailAccountPasswordRequest = {
  email: string;
  oldpassword: string;
  password1: string;
  password2: string;
  // api: any;
  api: boolean;
};
export type CreateEmailAccountFormValues = {
  domain: string;
  user: string;
  passwd: string;
  passwd2: string;
  quota: string;
  limit: string;
};
export type CreateEmailAccountRequest = {
  action: "create";
  domain: string;
  user: string;
  passwd: string;
  passwd2: string;
  quota: number;
  limit?: number;
};
export type DeleteEmailAccountRequest = {
  action: "delete";
  domain: string;
  user: string;
};

export type SuccessResponse = {
  error?: "0";
  text: string;
  details: string;
};
export type ErrorResponse = {
  error: "1";
  text: string;
  details: string;
};
export type BodyRequest =
  | CreateUserRequest
  | DeleteUserRequest
  | SuspendOrUnsuspendUserRequest
  | ModifyUserRequest
  | CreateNewDomainRequest
  | CreateSubdomainRequest
  | DeleteSubdomainRequest
  | CreateDatabaseRequest
  | DeleteDatabaseRequest
  | GetSessionRequest
  | GetEmailAccountsRequest
  | ChangeEmailAccountPasswordRequest
  | CreateEmailAccountRequest
  | DeleteEmailAccountRequest
  | { domain: string }
  | ChangeUserAccountEmailRequest
  | ChangeUserTicketingEmailRequest;
