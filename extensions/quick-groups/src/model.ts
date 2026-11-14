export interface ReferenceAction {
  kind: string;
  target: string;
}

export interface ReferenceField {
  label: string;
  effectiveValue: string;
  values: string[];
  actions: ReferenceAction[];
  sensitive: boolean;
}

export interface ReferenceRecord {
  collection: string;
  name: string;
  fields: ReferenceField[];
  source: string;
}

export interface Diagnostic {
  source: string;
  collection?: string;
  record?: string;
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface LoadResult {
  records: ReferenceRecord[];
  diagnostics: Diagnostic[];
}
