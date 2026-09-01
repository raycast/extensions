export type TemplateKind = "campaign" | "adset" | "ad";

export type FieldType = "text" | "textarea" | "dropdown" | "number" | "datetime";

export interface FieldOption {
  value: string;
  title: string;
}

export interface FieldDef {
  id: string;
  flag: string;
  title: string;
  description?: string;
  type: FieldType;
  required?: boolean;
  positional?: boolean;
  allowInTemplate?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  currency?: boolean;
}

export interface Template {
  id: string;
  name: string;
  kind: TemplateKind;
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Credentials {
  accessToken: string;
  adAccountId: string;
  pageId?: string;
  metaCliPath?: string;
}

export interface MetaRecord {
  id: string;
  name?: string;
  [key: string]: string | number | boolean | null | undefined;
}
