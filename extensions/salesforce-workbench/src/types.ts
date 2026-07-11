export type JsonPrimitive = string | number | boolean | null;
export type SalesforceRecord = Record<string, unknown> & {
  Id?: string;
  attributes?: { type?: string; url?: string };
};

export interface SalesforceOrg {
  orgId: string;
  alias: string;
  aliases: string[];
  username: string;
  instanceUrl: string;
  loginUrl?: string;
  isSandbox: boolean;
  connectedStatus: string;
  instanceApiVersion: string;
  isDefault: boolean;
  name?: string;
}

export interface RawSalesforceOrg {
  orgId: string;
  alias?: string;
  username: string;
  instanceUrl: string;
  loginUrl?: string;
  isSandbox?: boolean;
  connectedStatus?: string;
  instanceApiVersion?: string;
  isDefaultUsername?: boolean;
  name?: string;
}

export interface OrgListResult {
  nonScratchOrgs?: RawSalesforceOrg[];
  sandboxes?: RawSalesforceOrg[];
  devHubs?: RawSalesforceOrg[];
  other?: RawSalesforceOrg[];
}

export interface SfEnvelope<T> {
  status: number;
  result: T;
  warnings?: unknown[];
  message?: string;
  name?: string;
}

export interface QueryRequest {
  orgId: string;
  alias: string;
  soql: string;
  toolingApi: boolean;
  allRows: boolean;
}

export interface QueryResult {
  records: SalesforceRecord[];
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
}

export interface SearchResult {
  searchRecords: SalesforceRecord[];
}

export interface SearchObjectConfig {
  apiName: string;
  fields: string[];
  titleField: string;
  subtitleFields: string[];
}

export type DescribeFieldType =
  | "boolean"
  | "currency"
  | "date"
  | "datetime"
  | "double"
  | "email"
  | "int"
  | "multipicklist"
  | "percent"
  | "phone"
  | "picklist"
  | "reference"
  | "string"
  | "textarea"
  | "url"
  | string;

export interface DescribeField {
  name: string;
  label: string;
  type: DescribeFieldType;
  createable: boolean;
  updateable: boolean;
  nillable: boolean;
  defaultedOnCreate: boolean;
  calculated?: boolean;
  compoundFieldName?: string | null;
  length?: number;
  precision?: number;
  scale?: number;
  referenceTo?: string[];
  picklistValues?: Array<{ active: boolean; label: string; value: string }>;
}

export interface DescribeResult {
  name: string;
  label: string;
  labelPlural: string;
  queryable: boolean;
  searchable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  fields: DescribeField[];
}

export interface QueryHistoryEntry {
  id: string;
  kind: "query";
  mode: "soql" | "sosl";
  timestamp: string;
  orgId: string;
  orgAlias: string;
  text: string;
  toolingApi?: boolean;
  allRows?: boolean;
  rowCount: number;
  records: SalesforceRecord[];
  resultTruncated: boolean;
  exportedFile?: string;
  saved?: boolean;
}

export interface MutationAuditEntry {
  id: string;
  kind: "mutation";
  timestamp: string;
  orgId: string;
  orgAlias: string;
  action: "create" | "update" | "delete";
  objectApiName: string;
  recordId?: string;
  before: SalesforceRecord | null;
  after: SalesforceRecord | null;
  success: boolean;
  error?: string;
}

export type HistoryEntry = QueryHistoryEntry | MutationAuditEntry;

export interface WorkbenchPreferences {
  sfBinaryPath: string;
  exportDirectory: string;
  historyDays: string;
  historyLimit: string;
  additionalObjects?: string;
  preferredBrowser: "default" | "chrome" | "firefox" | "edge";
}

export interface SalesforceReleaseNote {
  id: string;
  title: string;
  url: string;
  category: string;
  section: string;
  level: number;
  releaseTitle: string;
  releaseVersion: string;
  isReleaseUpdate: boolean;
  isRetirement: boolean;
}

export interface SalesforceReleaseNotesFeed {
  releaseTitle: string;
  releaseVersion: string;
  isPreview: boolean;
  fetchedAt: string;
  publishedAt?: string;
  notes: SalesforceReleaseNote[];
}

export interface SalesforceReleaseNoteArticle {
  id: string;
  title: string;
  markdown: string;
  fetchedAt: string;
  publishedAt?: string;
}
