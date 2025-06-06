// Cloud Run API Response Types

export interface CloudRunContainer {
  image?: string;
  resources?: {
    limits?: {
      cpu?: string;
      memory?: string;
    };
  };
}

export interface CloudRunTemplateSpec {
  containers?: CloudRunContainer[];
}

export interface CloudRunTemplate {
  spec?: CloudRunTemplateSpec;
}

export interface CloudRunTrafficTarget {
  revisionName?: string;
  percent?: number;
}

export interface CloudRunServiceSpec {
  template?: CloudRunTemplate;
  traffic?: CloudRunTrafficTarget[];
}

export interface CloudRunCondition {
  status?: string;
  type?: string;
  lastTransitionTime?: string;
  message?: string;
  reason?: string;
}

export interface CloudRunServiceStatus {
  url?: string;
  conditions?: CloudRunCondition[];
  latestReadyRevisionName?: string;
  latestCreatedRevisionName?: string;
  observedGeneration?: number;
  traffic?: CloudRunTrafficTarget[];
}

export interface CloudRunServiceMetadata {
  name?: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  generation?: number;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface CloudRunServiceItem {
  apiVersion?: string;
  kind?: string;
  metadata?: CloudRunServiceMetadata;
  spec?: CloudRunServiceSpec;
  status?: CloudRunServiceStatus;
}

export interface CloudRunServiceResponse {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    selfLink?: string;
    resourceVersion?: string;
  };
  items?: CloudRunServiceItem[];
}

// Cloud Monitoring API Response Types

export interface MetricInterval {
  endTime: string;
  startTime?: string;
}

export interface DistributionValue {
  count?: string;
  mean?: string;
  sumOfSquaredDeviation?: string;
  range?: {
    min?: string;
    max?: string;
  };
  bucketCounts?: string[];
  bucketOptions?: {
    explicitBuckets?: {
      bounds?: string[];
    };
  };
}

export interface MetricValue {
  boolValue?: boolean;
  int64Value?: string;
  doubleValue?: string;
  stringValue?: string;
  distributionValue?: DistributionValue;
}

export interface MetricPoint {
  interval: MetricInterval;
  value: MetricValue;
}

export interface TimeSeries {
  metric?: {
    labels?: Record<string, string>;
    type?: string;
  };
  resource?: {
    type?: string;
    labels?: Record<string, string>;
  };
  metricKind?: string;
  valueType?: string;
  points?: MetricPoint[];
}

export interface MonitoringResponse {
  timeSeries?: TimeSeries[];
  nextPageToken?: string;
  executionErrors?: Array<{
    code?: number;
    message?: string;
  }>;
}

// Cloud Logging API Response Types

export interface LogSeverity {
  DEFAULT: "DEFAULT";
  DEBUG: "DEBUG";
  INFO: "INFO";
  NOTICE: "NOTICE";
  WARNING: "WARNING";
  ERROR: "ERROR";
  CRITICAL: "CRITICAL";
  ALERT: "ALERT";
  EMERGENCY: "EMERGENCY";
}

export interface LogEntry {
  logName?: string;
  resource?: {
    type?: string;
    labels?: Record<string, string>;
  };
  timestamp?: string;
  receiveTimestamp?: string;
  severity?: keyof LogSeverity;
  insertId?: string;
  httpRequest?: {
    requestMethod?: string;
    requestUrl?: string;
    requestSize?: string;
    status?: number;
    responseSize?: string;
    userAgent?: string;
    remoteIp?: string;
    serverIp?: string;
    referer?: string;
    latency?: string;
    cacheLookup?: boolean;
    cacheHit?: boolean;
    cacheValidatedWithOriginServer?: boolean;
    cacheFillBytes?: string;
    protocol?: string;
  };
  labels?: Record<string, string>;
  operation?: {
    id?: string;
    producer?: string;
    first?: boolean;
    last?: boolean;
  };
  trace?: string;
  spanId?: string;
  traceSampled?: boolean;
  sourceLocation?: {
    file?: string;
    line?: string;
    function?: string;
  };
  // Payload can be one of these types
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  protoPayload?: {
    "@type"?: string;
    status?: {
      code?: number;
      message?: string;
      details?: Array<Record<string, unknown>>;
    };
    [key: string]: unknown;
  };
}

export interface LoggingResponse {
  entries?: LogEntry[];
  nextPageToken?: string;
}

// Processed Data Types for UI

export interface ProcessedMetricsData {
  requestCount: Array<{ timestamp: string; value: number }>;
  latency: Array<{ timestamp: string; value: number }>;
  cpuUtilization: Array<{ timestamp: string; value: number }>;
  memoryUtilization: Array<{ timestamp: string; value: number }>;
  containerInstances?: Array<{ timestamp: string; value: number }>;
}

export interface ProcessedErrorData {
  timestamp: string;
  message: string;
  count: number;
}

// Utility type for API request parameters
export interface MonitoringQueryParams extends Record<string, string> {
  filter: string;
  "interval.startTime": string;
  "interval.endTime": string;
  "aggregation.alignmentPeriod": string;
  "aggregation.perSeriesAligner": string;
  "aggregation.crossSeriesReducer": string;
  "aggregation.groupByFields": string;
}

export interface LoggingQueryBody {
  resourceNames: string[];
  filter: string;
  orderBy: string;
  pageSize: number;
}
