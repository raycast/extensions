export interface Database {
  id: string;
  name: string;
  connectionString: string;
  isReadonly: boolean;
  createdAt: string;
}

export interface QueryHistory {
  id: string;
  query: string;
  databaseId: string;
  databaseName: string;
  executedAt: string;
  rowCount?: number;
  error?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  databaseId: string;
  databaseName: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: { name: string; dataTypeID: number }[];
  executionTime: number;
}

export interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
}
