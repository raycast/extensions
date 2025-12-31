// Kibana Instance Configuration
export interface KibanaInstance {
  name: string;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  commonFields?: string[];
}

// Data View Types
export interface DataView {
  id: string;
  attributes?: {
    title?: string;
    name?: string;
  };
  title?: string;
  name?: string;
}

export interface DataViewFormatted {
  number: number;
  name: string;
  title: string;
  id: string;
}

// Cache Types
export interface InstanceCache {
  instance: {
    name: string;
    url: string;
    commonFields?: string[];
  };
  dataViews: DataViewFormatted[];
}

export interface AllInstancesCache {
  [instanceName: string]: InstanceCache;
}

// Selection State Types
export interface FieldSelection {
  [dataViewId: string]: string[];
}

export interface TimeRangeSelection {
  [dataViewId: string]: string;
}

export interface QuerySelection {
  [dataViewId: string]: string;
}

// Time Range Type
export interface TimeRange {
  label: string;
  from: string;
  to: string;
}

// Preferences Types
export interface Preferences {
  instancesJson: string;
  defaultInstance?: string;
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  instances?: KibanaInstance[];
  error?: string;
}
