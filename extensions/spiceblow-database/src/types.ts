import { environment } from "@raycast/api";

export type StoredDatabase = {
  connectionString: string;
  name: string;
};

export type TableInfo = {
  columns: ColumnInfo[];
  relations?: RelationInfo[];
};

export type RelationInfo = {
  direction: "inbound" | "outbound";
  constraintName?: string;
  foreignSchema: string;
  foreignTable: string;
  columnNames: string[];
  foreignColumnNames: string[];
};

export type ColumnInfo = {
  columnName: string;
  originalColumnName?: string;
  schemaName?: string;
  tableName?: string;
  type: string;
  typeId: number;
  isNullable: boolean;
  defaultValue: string | null;
  enumValues?: string[];
  isPrimaryKey: boolean;
};

export type CustomQuery = {
  type: CustomQueryType;
  connectionString: string;
  query: string;
  tableInfo: TableInfo;
  bestField: string;
  prompt: string;
  schemas: string[];
  id: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export type CustomQueryType = "list" | "time-series";

export type GraphData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
  }[];
};

export type TimeSeriesItem = {
  time_bucket: string;
  category?: string;
  count: number;
};

export type LaunchContext = {
  view: "search-table";
  schemaTable: string;
  searchText: string;
};

export const launchContext: LaunchContext | null = (environment.launchContext as LaunchContext) || null;
