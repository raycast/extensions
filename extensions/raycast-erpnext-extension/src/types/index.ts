export interface DocType {
  name: string;
  module?: string;
  custom?: boolean;
  label?: string;
  is_submittable?: boolean;
  is_child_table?: boolean;
  track_changes?: boolean;
  description?: string;
}

export interface DocTypeItem {
  doctype?: string;
  name: string;
  content?: string; // This can be a summary or description of the document
  rank?: number;
  creation?: string;
  modified?: string;
  [key: string]: unknown; // Allow dynamic fields since ERPNext documents can have any fields
}

export interface GlobalSearchResult {
  doctype: string;
  name: string;
  content?: string;
  title?: string;
  route?: string;
  rank?: number;
  [key: string]: unknown; // Allow additional fields from the API response
}

export interface FrappeResponse<T> {
  data: T[];
  message?: string;
}

export interface DocField {
  fieldname: string;
  fieldtype: string;
  label: string;
  reqd?: number | boolean;
  options?: string;
  description?: string;
  hidden?: number | boolean;
  read_only?: number | boolean;
  in_list_view?: number | boolean;
  bold?: number | boolean;
  idx?: number;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
}

export interface DocTypeMeta {
  name: string;
  fields: DocField[];
  is_submittable?: boolean;
  title_field?: string;
  description?: string;
  module?: string;
}

export interface ERPNextPreferences {
  erpnext_url: string;
  api_key: string;
  api_secret: string;
}
