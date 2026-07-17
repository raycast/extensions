export interface AirtableBaseMetadata {
  id: string;
  title: string;
  baseUrl: string;
  apiDocsUrl: string;
  permissionLevel: string;
}

export interface AirtableMetadataApiBaseListResponse {
  bases: AirtableMetadataApiBaseDetails[];
  offset?: string;
}

export interface AirtableMetadataApiBaseDetails {
  id: string;
  name: string;
  permissionLevel: "none" | "read" | "comment" | "edit" | "create";
}

export interface AirtableMetadataApiBaseSchemaResponse {
  tables: Table[];
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: Field[];
  views: View[];
}

export interface Field {
  id: string;
  name: string;
  description?: string;
  type: string;
  options?: object;
}

export interface View {
  id: string;
  name: string;
  type: string;
}

export interface AirtableRecord {
  createdTime: string;
  fields: Record<string, string | boolean | number | string[]>;
  id: string;
}

export interface AirtableBaseRecordsResponse {
  records: AirtableRecord[];
}

export interface ErrorResponse {
  error: { type: string; message: string };
}
