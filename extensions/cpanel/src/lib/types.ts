export type AccountConfiguration = {
  domain: string;
  theme: string;
  uid: number;
  user: string;
  feature: {
    [feature: string]: "0" | "1";
  };
  ip: string;
  contact_email: string;
  dkim_enabled: "0" | "1";
  spf_enableds: "0" | "1";
};

export type Usage = {
  error: null;
  description: string;
  formatter: string | null;
  maximum: string | null;
  id: string;
  url: string;
  usage: number | string;
};

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

export type FileItem = {
  type: "dir" | "link" | "file";
  gid: number;
  path: string;
  fullpath: string;
  size: string;
  humansize: string;
  file: string;
  uid: number;
  exists: 0 | 1;
  mtime: number;
  mode: number;
  ctime: number;
  absdir: string;
  nicemode: string;
  rawmimetype: string;
  rawmimename: string;
  mimetype: string;
};

export type FileContent = {
  from_charset: string;
  path: string;
  content: string;
  filename: string;
  dir: string;
  to_charset: string;
};

export type FTPAccountWithDiskInformation = {
  serverlogin: string;
  diskusedpercent: number;
  _diskused: string;
  htmldir: string | null;
  diskused: string;
  deleteable: 0 | 1;
  accttype: "anonymous" | "logaccess" | "main" | "sub";
  login: string;
  humandiskquota: string;
  user: string;
  dir: string;
  reldir: string;
  type: "anonymous" | "logaccess" | "main" | "sub";
  _diskquota: string;
  diskquota: string;
  humandiskused: string;
  diskusedpercent20: number;
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
