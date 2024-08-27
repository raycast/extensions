export type AccountDomains = {
  main_domain: string;
  sub_domains: string[];
  parked_domains: string[];
  addon_domains: string[];
};

export type DNSZoneRecord = {
  line_index: number;
} & (
  | {
      type: "control" | "comment";
      text_b64: string;
    }
  | {
      type: "record";
      data_b64: string[];
      dname_b64: string;
      record_type: string;
      ttl: number;
    }
);

export type EmailAccount = {
  email: string;
  login: string;
  suspended_login: 0 | 1;
  suspended_incoming: 0 | 1;
};
export type EmailAccountWithDiskInformation = EmailAccount & {
  hold_outgoing: 0 | 1;
  diskusedpercent20: number;
  _diskquota: string | null;
  diskusedpercent_float: number;
  diskquota: string;
  humandiskquota: string;
  suspended_outgoing: 0 | 1;
  user: string;
  has_suspended: 0 | 1;
  mtime: number;
  _diskused: string | 0;
  diskused: string | 0;
  txtdiskquota: string;
  diskusedpercent: number;
  domain: string;
  humandiskused: string;
};

export type Database = {
  database: string;
  disk_usage: number;
  users: string[];
};

export type ErrorResponse = {
  metadata: Record<string, never>;
  status: 0;
  messages: null;
  warnings: null;
  data: null;
  errors: string[];
};
export type SuccessResponse<T> = {
  metadata: {
    [key: string]: unknown;
  };
  status: 1;
  messages: string[] | null;
  warnings: string[] | null;
  data: T;
  errors: null;
};
