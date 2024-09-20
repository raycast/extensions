export type StoredDatabase = {
  connectionString: string;
  name: string;
};

export type TableInfo = {
  columns: ColumnInfo[];
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
  isPrimaryKey: boolean;
};

export type CustomQueryList = {
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
