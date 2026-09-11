export type SQLDialect = "postgres" | "mysql" | "sqlite" | "tsql";

export type SQLEntryType = "keyword" | "clause" | "function" | "operator" | "datatype" | "pattern";

export type SyntaxBlock = {
  common: string[];
  overrides?: Partial<Record<SQLDialect, string[]>>;
};

export type ExamplesBlock = {
  common?: string[];
} & Partial<Record<SQLDialect, string[]>>;

export type DialectMetadata = {
  supported: SQLDialect[];
  notes?: Partial<Record<SQLDialect, string>>;
};

export type SQLEntry = {
  title: string;
  type: SQLEntryType;
  summary: string;
  syntax: SyntaxBlock;
  examples: ExamplesBlock;
  notes: string[];
  aliases: string[];
  tags: string[];
  related: string[];
  dialects: DialectMetadata;
  parameters?: string[];
};
