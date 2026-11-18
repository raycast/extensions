export type FirebaseValueType =
  | "STRING"
  | "BOOLEAN"
  | "NUMBER"
  | "JSON"
  | (string & {});
export type SemanticValueType = "bool" | "int" | "float" | "json" | "string";

export interface RemoteConfigValue {
  value: string;
  useInAppDefault?: boolean;
}

export interface RemoteConfigCondition {
  name: string;
  expression: string;
  tagColor?: string;
}

export interface RemoteConfigParameter {
  defaultValue?: RemoteConfigValue;
  conditionalValues?: Record<string, RemoteConfigValue>;
  description?: string;
  valueType?: FirebaseValueType;
}

export interface RemoteConfigVersionMetadata {
  versionNumber?: string;
  updateTime?: string;
  updateOrigin?: string;
  updateType?: string;
  description?: string;
  rollbackSource?: string;
  updateUser?: {
    email?: string;
    name?: string;
    imageUrl?: string;
  };
}

export interface RemoteConfigTemplate {
  conditions?: RemoteConfigCondition[];
  parameters?: Record<string, RemoteConfigParameter>;
  parameterGroups?: Record<string, unknown>;
  version?: RemoteConfigVersionMetadata;
}

export interface RemoteConfigVersion {
  versionNumber?: string;
  updateTime?: string;
  updateOrigin?: string;
  updateType?: string;
  description?: string;
  rollbackSource?: string;
  updateUser?: {
    email?: string;
    name?: string;
  };
}

export interface ProjectConfig {
  id: string;
  projectId: string;
  displayName: string;
  credentialRef?: string;
  tags: string[];
  enabled: boolean;
  source?: "manual" | "google-import";
}

export interface ProjectGroup {
  id: string;
  name: string;
  projectIds: string[];
}

export interface GoogleAuthStatus {
  isLoggedIn: boolean;
  email?: string;
  name?: string;
  method?: "adc";
}

export interface ParsedValue {
  raw: string;
  semanticType: SemanticValueType;
  parsed: boolean | number | unknown[] | Record<string, unknown> | string;
}

export interface ParameterProjectValue {
  project: ProjectConfig;
  parameter: RemoteConfigParameter;
  parsedDefault: ParsedValue | null;
  conditionalValues: Array<{
    conditionName: string;
    value: RemoteConfigValue;
    parsedValue: ParsedValue;
  }>;
}

export interface AggregatedParameter {
  key: string;
  projectValues: ParameterProjectValue[];
  projectsMissing: ProjectConfig[];
  firebaseValueTypes: FirebaseValueType[];
  semanticTypes: SemanticValueType[];
  hasConditionalValues: boolean;
  divergentDefaults: boolean;
}

export interface ConditionProjectValue {
  project: ProjectConfig;
  condition: RemoteConfigCondition;
  parameterReferences: string[];
}

export interface AggregatedCondition {
  name: string;
  projectValues: ConditionProjectValue[];
  projectsMissing: ProjectConfig[];
  divergentExpressions: boolean;
}

export interface ProjectSnapshot {
  project: ProjectConfig;
  template: RemoteConfigTemplate;
  etag: string;
  fetchedAt: string;
}

export type BulkOperation =
  | {
      type: "upsert-parameter";
      key: string;
      rawValue: string;
      firebaseValueType: FirebaseValueType;
      description?: string;
    }
  | {
      type: "delete-parameter";
      key: string;
    }
  | {
      type: "set-conditional-value";
      key: string;
      conditionName: string;
      rawValue: string;
      firebaseValueType?: FirebaseValueType;
      description?: string;
    }
  | {
      type: "remove-conditional-value";
      key: string;
      conditionName: string;
    }
  | {
      type: "clone-parameter";
      sourceKey: string;
      targetKey: string;
      deleteSource?: boolean;
    }
  | {
      type: "upsert-condition";
      name: string;
      expression: string;
      tagColor?: string;
    }
  | {
      type: "delete-condition";
      name: string;
    };

export interface PreparedBulkResult {
  project: ProjectConfig;
  status: "preview" | "no-op" | "error";
  error?: string;
  changes: string[];
  originalTemplate?: RemoteConfigTemplate;
  updatedTemplate?: RemoteConfigTemplate;
  etag?: string;
}

export interface PublishedBulkResult {
  project: ProjectConfig;
  status: "success" | "no-op" | "conflict" | "error";
  changes: string[];
  error?: string;
}

export interface SelectableProjectScope {
  groupId?: string;
  projectIds?: string[];
}
