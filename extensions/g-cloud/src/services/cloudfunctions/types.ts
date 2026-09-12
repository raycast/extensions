/**
 * Cloud Functions v2 Types
 *
 * Based on Google Cloud Functions v2 API
 * https://cloud.google.com/functions/docs/reference/rest/v2
 */

export type FunctionState = "ACTIVE" | "FAILED" | "DEPLOYING" | "DELETING" | "UNKNOWN" | "STATE_UNSPECIFIED";

export type Runtime =
  | "nodejs20"
  | "nodejs18"
  | "nodejs16"
  | "python312"
  | "python311"
  | "python310"
  | "python39"
  | "go122"
  | "go121"
  | "go120"
  | "java21"
  | "java17"
  | "java11"
  | "dotnet8"
  | "dotnet6"
  | "ruby33"
  | "ruby32"
  | "php83"
  | "php82";

export interface CloudFunction {
  /** Full resource name: projects/{project}/locations/{location}/functions/{function} */
  name: string;
  /** User-provided description */
  description?: string;
  /** Current state of the function */
  state: FunctionState;
  /** Build configuration */
  buildConfig?: {
    /** Runtime environment (e.g., nodejs20, python311) */
    runtime?: string;
    /** Entry point function name */
    entryPoint?: string;
    /** Source code location */
    source?: {
      storageSource?: {
        bucket: string;
        object: string;
        generation?: string;
      };
      repoSource?: {
        projectId?: string;
        repoName?: string;
        branchName?: string;
        tagName?: string;
        commitSha?: string;
        dir?: string;
      };
    };
    /** Build worker pool */
    workerPool?: string;
    /** Environment variables for build */
    environmentVariables?: Record<string, string>;
    /** Docker repository for storing build images */
    dockerRepository?: string;
  };
  /** Service configuration (runtime settings) */
  serviceConfig?: {
    /** HTTP(S) trigger URL */
    uri?: string;
    /** Underlying Cloud Run service */
    service?: string;
    /** Service account email */
    serviceAccountEmail?: string;
    /** Maximum request timeout in seconds */
    timeoutSeconds?: number;
    /** Available memory (e.g., "256Mi", "1Gi") */
    availableMemory?: string;
    /** Available CPU (e.g., "1", "2") */
    availableCpu?: string;
    /** Minimum instance count (0 = scale to zero) */
    minInstanceCount?: number;
    /** Maximum instance count */
    maxInstanceCount?: number;
    /** Max concurrent requests per instance */
    maxInstanceRequestConcurrency?: number;
    /** Environment variables */
    environmentVariables?: Record<string, string>;
    /** Secret environment variables */
    secretEnvironmentVariables?: Array<{
      key: string;
      projectId?: string;
      secret: string;
      version?: string;
    }>;
    /** VPC connector */
    vpcConnector?: string;
    /** VPC connector egress settings */
    vpcConnectorEgressSettings?: "VPC_CONNECTOR_EGRESS_SETTINGS_UNSPECIFIED" | "PRIVATE_RANGES_ONLY" | "ALL_TRAFFIC";
    /** Ingress settings */
    ingressSettings?: "INGRESS_SETTINGS_UNSPECIFIED" | "ALLOW_ALL" | "ALLOW_INTERNAL_ONLY" | "ALLOW_INTERNAL_AND_GCLB";
    /** Whether all traffic should be routed through VPC */
    allTrafficOnLatestRevision?: boolean;
    /** Revision of the Cloud Run service */
    revision?: string;
  };
  /** Event trigger configuration (for non-HTTP triggers) */
  eventTrigger?: {
    /** Event trigger type */
    trigger?: string;
    /** Trigger region */
    triggerRegion?: string;
    /** Event type */
    eventType?: string;
    /** Pub/Sub topic */
    pubsubTopic?: string;
    /** Service account for trigger */
    serviceAccountEmail?: string;
    /** Retry policy */
    retryPolicy?: "RETRY_POLICY_UNSPECIFIED" | "RETRY_POLICY_DO_NOT_RETRY" | "RETRY_POLICY_RETRY";
    /** Event filters */
    eventFilters?: Array<{
      attribute: string;
      value: string;
      operator?: string;
    }>;
    /** Channel for Eventarc trigger */
    channel?: string;
  };
  /** Labels */
  labels?: Record<string, string>;
  /** Creation timestamp */
  createTime?: string;
  /** Update timestamp */
  updateTime?: string;
  /** Function URL (for HTTP triggers) */
  url?: string;
  /** KMS key for encryption */
  kmsKeyName?: string;
  /** Function environment (GEN_1 or GEN_2) */
  environment?: "ENVIRONMENT_UNSPECIFIED" | "GEN_1" | "GEN_2";
  /** Satisfies PZS requirement */
  satisfiesPzs?: boolean;
  /** Upgrade info */
  upgradeInfo?: {
    upgradeState?: string;
  };
}

/** Options for creating a new Cloud Function */
export interface CreateCloudFunctionOptions {
  runtime: Runtime;
  entryPoint: string;
  memory?: string;
  timeout?: number;
  minInstances?: number;
  maxInstances?: number;
  environmentVariables?: Record<string, string>;
  allowUnauthenticated?: boolean;
}

/** Function deployment status for UI */
export interface FunctionStatus {
  icon: string;
  color: string;
  text: string;
}

/** Runtime information for UI */
export interface RuntimeInfo {
  id: Runtime;
  name: string;
  language: string;
}

/** Available runtimes grouped by language */
export const RUNTIMES: RuntimeInfo[] = [
  { id: "nodejs20", name: "Node.js 20", language: "Node.js" },
  { id: "nodejs18", name: "Node.js 18", language: "Node.js" },
  { id: "python312", name: "Python 3.12", language: "Python" },
  { id: "python311", name: "Python 3.11", language: "Python" },
  { id: "python310", name: "Python 3.10", language: "Python" },
  { id: "go122", name: "Go 1.22", language: "Go" },
  { id: "go121", name: "Go 1.21", language: "Go" },
  { id: "java21", name: "Java 21", language: "Java" },
  { id: "java17", name: "Java 17", language: "Java" },
  { id: "dotnet8", name: ".NET 8", language: ".NET" },
  { id: "dotnet6", name: ".NET 6", language: ".NET" },
  { id: "ruby33", name: "Ruby 3.3", language: "Ruby" },
  { id: "php83", name: "PHP 8.3", language: "PHP" },
];

/** Memory options for Cloud Functions */
export const MEMORY_OPTIONS = [
  { value: "128Mi", title: "128 MB" },
  { value: "256Mi", title: "256 MB" },
  { value: "512Mi", title: "512 MB" },
  { value: "1Gi", title: "1 GB" },
  { value: "2Gi", title: "2 GB" },
  { value: "4Gi", title: "4 GB" },
  { value: "8Gi", title: "8 GB" },
  { value: "16Gi", title: "16 GB" },
];

/** Region options for Cloud Functions */
export const CLOUD_FUNCTIONS_REGIONS = [
  { value: "us-central1", title: "Iowa (us-central1)" },
  { value: "us-east1", title: "South Carolina (us-east1)" },
  { value: "us-east4", title: "Virginia (us-east4)" },
  { value: "us-west1", title: "Oregon (us-west1)" },
  { value: "europe-west1", title: "Belgium (europe-west1)" },
  { value: "europe-west2", title: "London (europe-west2)" },
  { value: "europe-west3", title: "Frankfurt (europe-west3)" },
  { value: "asia-east1", title: "Taiwan (asia-east1)" },
  { value: "asia-northeast1", title: "Tokyo (asia-northeast1)" },
  { value: "asia-southeast1", title: "Singapore (asia-southeast1)" },
  { value: "australia-southeast1", title: "Sydney (australia-southeast1)" },
  { value: "southamerica-east1", title: "Sao Paulo (southamerica-east1)" },
];
