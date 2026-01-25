/**
 * Google Cloud REST API Client
 *
 * Replaces gcloud CLI subprocess calls with direct REST API calls
 * for significantly improved performance (~30-50% faster).
 *
 * Only uses gcloud CLI for:
 * - Getting access token (once per ~55 min)
 * - Authentication flow (browser-based login)
 */

import { Cache } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Base API URLs
export const COMPUTE_API = "https://compute.googleapis.com/compute/v1";
export const STORAGE_API = "https://storage.googleapis.com/storage/v1";
export const IAM_API = "https://iam.googleapis.com/v1";
export const CRM_API = "https://cloudresourcemanager.googleapis.com/v1";
export const SECRETS_API = "https://secretmanager.googleapis.com/v1";
export const CLOUDRUN_API = "https://run.googleapis.com/v2";
export const CLOUDFUNCTIONS_API = "https://cloudfunctions.googleapis.com/v2";
export const LOGGING_API = "https://logging.googleapis.com/v2";

// Persistent cache for token (survives extension reloads)
const cache = new Cache();
const TOKEN_KEY = "gcp-access-token";

interface CachedToken {
  token: string;
  expiresAt: number;
}

function getCachedToken(): CachedToken | null {
  const data = cache.get(TOKEN_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as CachedToken;
  } catch {
    return null;
  }
}

function setCachedToken(token: string, expiresAt: number): void {
  cache.set(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
}

/**
 * Quote a path if it contains spaces (for Windows compatibility)
 */
function quotePath(path: string): string {
  return path.includes(" ") ? `"${path}"` : path;
}

/**
 * Get access token from gcloud CLI (cached for 55 minutes using persistent storage)
 */
export async function getAccessToken(gcloudPath: string): Promise<string> {
  const cached = getCachedToken();
  if (cached && Date.now() < cached.expiresAt - 300000) {
    return cached.token;
  }

  const quotedPath = quotePath(gcloudPath);
  try {
    const { stdout } = await execPromise(`${quotedPath} auth print-access-token`, {
      timeout: 10000,
    });
    const token = stdout.trim();

    if (!token) {
      throw new Error("No access token returned");
    }

    const expiresAt = Date.now() + 55 * 60 * 1000;
    setCachedToken(token, expiresAt);
    return token;
  } catch (error) {
    // Clear cache on error
    cache.remove(TOKEN_KEY);
    throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Clear the cached token (useful when re-authenticating)
 */
export function clearTokenCache(): void {
  cache.remove(TOKEN_KEY);
}

/**
 * GCP API error response structure
 */
interface GcpErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ message: string; reason: string }>;
  };
}

/**
 * Make an authenticated request to Google Cloud REST API
 */
export async function gcpFetch<T>(gcloudPath: string, url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken(gcloudPath);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as GcpErrorResponse;
    const errorMessage = errorBody.error?.message || `API error: ${response.status} ${response.statusText}`;

    // Handle specific error codes
    if (response.status === 401) {
      clearTokenCache();
      throw new Error("Authentication expired. Please re-authenticate.");
    }

    if (response.status === 403) {
      throw new Error(`Permission denied: ${errorMessage}`);
    }

    if (response.status === 404) {
      throw new Error(`Resource not found: ${errorMessage}`);
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * Make a POST request (for operations like start/stop VM)
 */
export async function gcpPost<T>(gcloudPath: string, url: string, body?: unknown): Promise<T> {
  return gcpFetch<T>(gcloudPath, url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Make a DELETE request
 */
export async function gcpDelete<T>(gcloudPath: string, url: string): Promise<T> {
  return gcpFetch<T>(gcloudPath, url, {
    method: "DELETE",
  });
}

/**
 * Make a PATCH request
 */
export async function gcpPatch<T>(gcloudPath: string, url: string, body: unknown): Promise<T> {
  return gcpFetch<T>(gcloudPath, url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ============================================================================
// Compute Engine API
// ============================================================================

export interface ComputeInstance {
  id: string;
  name: string;
  zone: string;
  machineType: string;
  status: string;
  cpuPlatform?: string;
  creationTimestamp: string;
  networkInterfaces?: Array<{
    network: string;
    networkIP: string;
    accessConfigs?: Array<{
      natIP?: string;
      type: string;
    }>;
  }>;
  disks?: Array<{
    boot: boolean;
    source: string;
    deviceName: string;
  }>;
  labels?: Record<string, string>;
  tags?: { items?: string[] };
  metadata?: { items?: Array<{ key: string; value: string }> };
  scheduling?: {
    automaticRestart?: boolean;
    onHostMaintenance?: string;
    preemptible?: boolean;
  };
  serviceAccounts?: Array<{
    email: string;
    scopes: string[];
  }>;
}

interface AggregatedInstancesResponse {
  items?: Record<
    string,
    {
      instances?: ComputeInstance[];
      warning?: { code: string; message: string };
    }
  >;
}

interface InstanceListResponse {
  items?: ComputeInstance[];
}

export async function listComputeInstances(
  gcloudPath: string,
  projectId: string,
  zone?: string,
): Promise<ComputeInstance[]> {
  if (zone) {
    // Single zone query
    const url = `${COMPUTE_API}/projects/${projectId}/zones/${zone}/instances`;
    const response = await gcpFetch<InstanceListResponse>(gcloudPath, url);
    return response.items || [];
  }

  // Aggregated query (all zones)
  const url = `${COMPUTE_API}/projects/${projectId}/aggregated/instances`;
  const response = await gcpFetch<AggregatedInstancesResponse>(gcloudPath, url);

  const instances: ComputeInstance[] = [];
  if (response.items) {
    for (const zoneData of Object.values(response.items)) {
      if (zoneData.instances) {
        instances.push(...zoneData.instances);
      }
    }
  }
  return instances;
}

export async function getComputeInstance(
  gcloudPath: string,
  projectId: string,
  zone: string,
  instanceName: string,
): Promise<ComputeInstance> {
  const url = `${COMPUTE_API}/projects/${projectId}/zones/${zone}/instances/${instanceName}`;
  return gcpFetch<ComputeInstance>(gcloudPath, url);
}

export async function startComputeInstance(
  gcloudPath: string,
  projectId: string,
  zone: string,
  instanceName: string,
): Promise<void> {
  const url = `${COMPUTE_API}/projects/${projectId}/zones/${zone}/instances/${instanceName}/start`;
  await gcpPost(gcloudPath, url);
}

export async function stopComputeInstance(
  gcloudPath: string,
  projectId: string,
  zone: string,
  instanceName: string,
): Promise<void> {
  const url = `${COMPUTE_API}/projects/${projectId}/zones/${zone}/instances/${instanceName}/stop`;
  await gcpPost(gcloudPath, url);
}

export interface ComputeZone {
  id: string;
  name: string;
  description: string;
  status: string;
  region: string;
}

export async function listComputeZones(gcloudPath: string, projectId: string): Promise<ComputeZone[]> {
  const url = `${COMPUTE_API}/projects/${projectId}/zones`;
  const response = await gcpFetch<{ items?: ComputeZone[] }>(gcloudPath, url);
  return response.items || [];
}

export interface ComputeDisk {
  id: string;
  name: string;
  zone: string;
  sizeGb: string;
  status: string;
  type: string;
  sourceImage?: string;
  creationTimestamp: string;
  users?: string[];
  labels?: Record<string, string>;
}

export async function listComputeDisks(gcloudPath: string, projectId: string, zone?: string): Promise<ComputeDisk[]> {
  if (zone) {
    const url = `${COMPUTE_API}/projects/${projectId}/zones/${zone}/disks`;
    const response = await gcpFetch<{ items?: ComputeDisk[] }>(gcloudPath, url);
    return response.items || [];
  }

  // Aggregated query
  const url = `${COMPUTE_API}/projects/${projectId}/aggregated/disks`;
  const response = await gcpFetch<{
    items?: Record<string, { disks?: ComputeDisk[] }>;
  }>(gcloudPath, url);

  const disks: ComputeDisk[] = [];
  if (response.items) {
    for (const zoneData of Object.values(response.items)) {
      if (zoneData.disks) {
        disks.push(...zoneData.disks);
      }
    }
  }
  return disks;
}

// ============================================================================
// Cloud Storage API
// ============================================================================

export interface StorageBucket {
  id: string;
  name: string;
  location: string;
  storageClass: string;
  timeCreated: string;
  updated: string;
  labels?: Record<string, string>;
  versioning?: { enabled: boolean };
  iamConfiguration?: {
    uniformBucketLevelAccess?: { enabled: boolean };
  };
}

export async function listStorageBuckets(gcloudPath: string, projectId: string): Promise<StorageBucket[]> {
  const url = `${STORAGE_API}/b?project=${projectId}`;
  const response = await gcpFetch<{ items?: StorageBucket[] }>(gcloudPath, url);
  return response.items || [];
}

export async function getStorageBucket(gcloudPath: string, bucketName: string): Promise<StorageBucket> {
  const url = `${STORAGE_API}/b/${bucketName}`;
  return gcpFetch<StorageBucket>(gcloudPath, url);
}

export async function createStorageBucket(
  gcloudPath: string,
  projectId: string,
  name: string,
  location: string,
  storageClass: string = "STANDARD",
): Promise<StorageBucket> {
  const url = `${STORAGE_API}/b?project=${projectId}`;
  return gcpPost<StorageBucket>(gcloudPath, url, {
    name,
    location,
    storageClass,
  });
}

export async function deleteStorageBucket(gcloudPath: string, bucketName: string): Promise<void> {
  const url = `${STORAGE_API}/b/${bucketName}`;
  await gcpDelete(gcloudPath, url);
}

export interface BucketIamPolicy {
  bindings?: Array<{
    role: string;
    members: string[];
  }>;
  etag?: string;
}

export async function getBucketIamPolicy(gcloudPath: string, bucketName: string): Promise<BucketIamPolicy> {
  const url = `${STORAGE_API}/b/${bucketName}/iam`;
  return gcpFetch<BucketIamPolicy>(gcloudPath, url);
}

// ============================================================================
// IAM API
// ============================================================================

export interface IamPolicy {
  version: number;
  etag: string;
  bindings?: Array<{
    role: string;
    members: string[];
    condition?: {
      title: string;
      description?: string;
      expression: string;
    };
  }>;
}

export async function getProjectIamPolicy(gcloudPath: string, projectId: string): Promise<IamPolicy> {
  const url = `${CRM_API}/projects/${projectId}:getIamPolicy`;
  return gcpPost<IamPolicy>(gcloudPath, url, {});
}

export interface ServiceAccount {
  name: string;
  email: string;
  displayName?: string;
  description?: string;
  disabled?: boolean;
}

export async function listServiceAccounts(gcloudPath: string, projectId: string): Promise<ServiceAccount[]> {
  const url = `${IAM_API}/projects/${projectId}/serviceAccounts`;
  const response = await gcpFetch<{ accounts?: ServiceAccount[] }>(gcloudPath, url);
  return response.accounts || [];
}

export interface IamRole {
  name: string;
  title: string;
  description?: string;
  includedPermissions?: string[];
  stage?: string;
  etag?: string;
}

export async function listIamRoles(gcloudPath: string): Promise<IamRole[]> {
  const url = `${IAM_API}/roles`;
  const response = await gcpFetch<{ roles?: IamRole[] }>(gcloudPath, url);
  return response.roles || [];
}

// ============================================================================
// VPC Network API
// ============================================================================

export interface VpcNetwork {
  id: string;
  name: string;
  description?: string;
  autoCreateSubnetworks: boolean;
  creationTimestamp: string;
  routingConfig?: { routingMode: string };
  mtu?: number;
}

export async function listVpcNetworks(gcloudPath: string, projectId: string): Promise<VpcNetwork[]> {
  const url = `${COMPUTE_API}/projects/${projectId}/global/networks`;
  const response = await gcpFetch<{ items?: VpcNetwork[] }>(gcloudPath, url);
  return response.items || [];
}

export interface Subnet {
  id: string;
  name: string;
  network: string;
  region: string;
  ipCidrRange: string;
  gatewayAddress?: string;
  privateIpGoogleAccess: boolean;
  creationTimestamp: string;
}

export async function listSubnets(gcloudPath: string, projectId: string, region?: string): Promise<Subnet[]> {
  if (region) {
    const url = `${COMPUTE_API}/projects/${projectId}/regions/${region}/subnetworks`;
    const response = await gcpFetch<{ items?: Subnet[] }>(gcloudPath, url);
    return response.items || [];
  }

  // Aggregated query
  const url = `${COMPUTE_API}/projects/${projectId}/aggregated/subnetworks`;
  const response = await gcpFetch<{
    items?: Record<string, { subnetworks?: Subnet[] }>;
  }>(gcloudPath, url);

  const subnets: Subnet[] = [];
  if (response.items) {
    for (const regionData of Object.values(response.items)) {
      if (regionData.subnetworks) {
        subnets.push(...regionData.subnetworks);
      }
    }
  }
  return subnets;
}

export interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  network: string;
  priority: number;
  direction: string;
  disabled: boolean;
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  allowed?: Array<{
    IPProtocol: string;
    ports?: string[];
  }>;
  denied?: Array<{
    IPProtocol: string;
    ports?: string[];
  }>;
  creationTimestamp: string;
}

export async function listFirewallRules(gcloudPath: string, projectId: string): Promise<FirewallRule[]> {
  const url = `${COMPUTE_API}/projects/${projectId}/global/firewalls`;
  const response = await gcpFetch<{ items?: FirewallRule[] }>(gcloudPath, url);
  return response.items || [];
}

export interface IpAddress {
  id: string;
  name: string;
  address: string;
  status: string;
  region?: string;
  addressType: string;
  networkTier?: string;
  creationTimestamp: string;
  users?: string[];
}

export async function listIpAddresses(gcloudPath: string, projectId: string): Promise<IpAddress[]> {
  // Aggregated query for all regions
  const url = `${COMPUTE_API}/projects/${projectId}/aggregated/addresses`;
  const response = await gcpFetch<{
    items?: Record<string, { addresses?: IpAddress[] }>;
  }>(gcloudPath, url);

  const addresses: IpAddress[] = [];
  if (response.items) {
    for (const regionData of Object.values(response.items)) {
      if (regionData.addresses) {
        addresses.push(...regionData.addresses);
      }
    }
  }
  return addresses;
}

// ============================================================================
// Secret Manager API
// ============================================================================

export interface Secret {
  name: string;
  createTime: string;
  labels?: Record<string, string>;
  replication?: {
    automatic?: Record<string, unknown>;
    userManaged?: {
      replicas: Array<{ location: string }>;
    };
  };
}

export async function listSecrets(gcloudPath: string, projectId: string): Promise<Secret[]> {
  const url = `${SECRETS_API}/projects/${projectId}/secrets`;
  const response = await gcpFetch<{ secrets?: Secret[] }>(gcloudPath, url);
  return response.secrets || [];
}

export async function getSecret(gcloudPath: string, projectId: string, secretId: string): Promise<Secret> {
  const url = `${SECRETS_API}/projects/${projectId}/secrets/${secretId}`;
  return gcpFetch<Secret>(gcloudPath, url);
}

export interface SecretVersion {
  name: string;
  createTime: string;
  state: "ENABLED" | "DISABLED" | "DESTROYED";
  destroyTime?: string;
}

export async function listSecretVersions(
  gcloudPath: string,
  projectId: string,
  secretId: string,
): Promise<SecretVersion[]> {
  const url = `${SECRETS_API}/projects/${projectId}/secrets/${secretId}/versions`;
  const response = await gcpFetch<{ versions?: SecretVersion[] }>(gcloudPath, url);
  return response.versions || [];
}

export async function accessSecretVersion(
  gcloudPath: string,
  projectId: string,
  secretId: string,
  version: string = "latest",
): Promise<string> {
  const url = `${SECRETS_API}/projects/${projectId}/secrets/${secretId}/versions/${version}:access`;
  const response = await gcpFetch<{ payload: { data: string } }>(gcloudPath, url);
  // Data is base64 encoded
  return Buffer.from(response.payload.data, "base64").toString("utf-8");
}

export async function createSecret(
  gcloudPath: string,
  projectId: string,
  secretId: string,
  secretValue: string,
): Promise<Secret> {
  // First create the secret
  const createUrl = `${SECRETS_API}/projects/${projectId}/secrets?secretId=${secretId}`;
  const secret = await gcpPost<Secret>(gcloudPath, createUrl, {
    replication: { automatic: {} },
  });

  // Then add the first version with the value
  const versionUrl = `${SECRETS_API}/projects/${projectId}/secrets/${secretId}:addVersion`;
  await gcpPost(gcloudPath, versionUrl, {
    payload: {
      data: Buffer.from(secretValue).toString("base64"),
    },
  });

  return secret;
}

export async function deleteSecret(gcloudPath: string, projectId: string, secretId: string): Promise<void> {
  const url = `${SECRETS_API}/projects/${projectId}/secrets/${secretId}`;
  await gcpDelete(gcloudPath, url);
}

// ============================================================================
// Resource Manager API (Projects)
// ============================================================================

export interface Project {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
  createTime: string;
  labels?: Record<string, string>;
}

export async function listProjects(gcloudPath: string): Promise<Project[]> {
  const url = `${CRM_API}/projects`;
  const response = await gcpFetch<{ projects?: Project[] }>(gcloudPath, url);
  return response.projects || [];
}

// ============================================================================
// Cloud Run API (v2)
// ============================================================================

export interface CloudRunService {
  name: string; // projects/{project}/locations/{location}/services/{service}
  uid: string;
  generation: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createTime: string;
  updateTime: string;
  creator?: string;
  lastModifier?: string;
  uri?: string; // https://service-xxx.run.app
  reconciling?: boolean;
  conditions?: Array<{
    type: string;
    state: "CONDITION_SUCCEEDED" | "CONDITION_FAILED" | "CONDITION_PENDING";
    message?: string;
    lastTransitionTime?: string;
    reason?: string;
  }>;
  template?: {
    revision?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    scaling?: {
      minInstanceCount?: number;
      maxInstanceCount?: number;
    };
    timeout?: string;
    serviceAccount?: string;
    containers?: Array<{
      name?: string;
      image: string;
      command?: string[];
      args?: string[];
      env?: Array<{ name: string; value?: string }>;
      resources?: {
        limits?: Record<string, string>;
        cpuIdle?: boolean;
      };
      ports?: Array<{ name?: string; containerPort: number }>;
    }>;
    maxInstanceRequestConcurrency?: number;
  };
  traffic?: Array<{
    type?: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST" | "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION";
    revision?: string;
    percent?: number;
    tag?: string;
  }>;
  trafficStatuses?: Array<{
    type?: string;
    revision?: string;
    percent?: number;
    uri?: string;
  }>;
}

export interface CloudRunRevision {
  name: string; // projects/{project}/locations/{location}/services/{service}/revisions/{revision}
  uid: string;
  generation: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createTime: string;
  updateTime: string;
  conditions?: Array<{
    type: string;
    state: string;
    message?: string;
  }>;
  scaling?: {
    minInstanceCount?: number;
    maxInstanceCount?: number;
  };
  containers?: Array<{
    image: string;
    resources?: {
      limits?: Record<string, string>;
    };
  }>;
  service?: string;
}

export async function listCloudRunServices(gcloudPath: string, projectId: string): Promise<CloudRunService[]> {
  // Use "-" for location to list from all regions
  const url = `${CLOUDRUN_API}/projects/${projectId}/locations/-/services`;
  const response = await gcpFetch<{ services?: CloudRunService[] }>(gcloudPath, url);
  return response.services || [];
}

export async function getCloudRunService(
  gcloudPath: string,
  projectId: string,
  location: string,
  serviceName: string,
): Promise<CloudRunService> {
  const url = `${CLOUDRUN_API}/projects/${projectId}/locations/${location}/services/${serviceName}`;
  return gcpFetch<CloudRunService>(gcloudPath, url);
}

export async function listCloudRunRevisions(
  gcloudPath: string,
  projectId: string,
  location: string,
  serviceName: string,
): Promise<CloudRunRevision[]> {
  const url = `${CLOUDRUN_API}/projects/${projectId}/locations/${location}/services/${serviceName}/revisions`;
  const response = await gcpFetch<{ revisions?: CloudRunRevision[] }>(gcloudPath, url);
  return response.revisions || [];
}

export interface CreateCloudRunServiceOptions {
  port?: number;
  memory?: string;
  cpu?: string;
  minInstances?: number;
  maxInstances?: number;
  env?: Record<string, string>;
  allowUnauthenticated?: boolean;
  timeout?: string;
  concurrency?: number;
}

export async function createCloudRunService(
  gcloudPath: string,
  projectId: string,
  location: string,
  serviceName: string,
  image: string,
  options: CreateCloudRunServiceOptions = {},
): Promise<CloudRunService> {
  const url = `${CLOUDRUN_API}/projects/${projectId}/locations/${location}/services?serviceId=${serviceName}`;

  const envVars = options.env ? Object.entries(options.env).map(([name, value]) => ({ name, value })) : undefined;

  const body = {
    template: {
      containers: [
        {
          image,
          ports: [{ containerPort: options.port || 8080 }],
          resources: {
            limits: {
              memory: options.memory || "512Mi",
              cpu: options.cpu || "1",
            },
          },
          ...(envVars && { env: envVars }),
        },
      ],
      scaling: {
        minInstanceCount: options.minInstances ?? 0,
        maxInstanceCount: options.maxInstances ?? 100,
      },
      ...(options.timeout && { timeout: options.timeout }),
      ...(options.concurrency && { maxInstanceRequestConcurrency: options.concurrency }),
    },
  };

  return gcpPost<CloudRunService>(gcloudPath, url, body);
}

export async function deleteCloudRunService(
  gcloudPath: string,
  projectId: string,
  location: string,
  serviceName: string,
): Promise<void> {
  const url = `${CLOUDRUN_API}/projects/${projectId}/locations/${location}/services/${serviceName}`;
  await gcpDelete(gcloudPath, url);
}

export async function updateCloudRunService(
  gcloudPath: string,
  projectId: string,
  location: string,
  serviceName: string,
  updates: {
    image?: string;
    env?: Record<string, string>;
    memory?: string;
    cpu?: string;
    minInstances?: number;
    maxInstances?: number;
  },
): Promise<CloudRunService> {
  // First get the current service to modify it
  const current = await getCloudRunService(gcloudPath, projectId, location, serviceName);

  // Build the updated template
  const currentContainer = current.template?.containers?.[0] || { image: "" };
  const envVars = updates.env
    ? Object.entries(updates.env).map(([name, value]) => ({ name, value }))
    : currentContainer.env;

  const body = {
    template: {
      containers: [
        {
          image: updates.image || currentContainer.image,
          ports: currentContainer.ports || [{ containerPort: 8080 }],
          resources: {
            limits: {
              memory: updates.memory || currentContainer.resources?.limits?.memory || "512Mi",
              cpu: updates.cpu || currentContainer.resources?.limits?.cpu || "1",
            },
          },
          ...(envVars && { env: envVars }),
        },
      ],
      scaling: {
        minInstanceCount: updates.minInstances ?? current.template?.scaling?.minInstanceCount ?? 0,
        maxInstanceCount: updates.maxInstances ?? current.template?.scaling?.maxInstanceCount ?? 100,
      },
    },
  };

  const url = `${CLOUDRUN_API}/projects/${projectId}/locations/${location}/services/${serviceName}`;
  return gcpPatch<CloudRunService>(gcloudPath, url, body);
}

// ============================================================================
// Cloud Logging API
// ============================================================================

export type LogSeverity =
  | "DEFAULT"
  | "DEBUG"
  | "INFO"
  | "NOTICE"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "ALERT"
  | "EMERGENCY";

export interface LogEntry {
  logName: string;
  resource: {
    type: string;
    labels: Record<string, string>;
  };
  timestamp: string;
  receiveTimestamp?: string;
  severity?: LogSeverity;
  insertId?: string;
  httpRequest?: {
    requestMethod?: string;
    requestUrl?: string;
    status?: number;
    userAgent?: string;
    remoteIp?: string;
    latency?: string;
  };
  labels?: Record<string, string>;
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  protoPayload?: Record<string, unknown>;
  trace?: string;
  spanId?: string;
  sourceLocation?: {
    file?: string;
    line?: string;
    function?: string;
  };
}

export interface ListLogEntriesOptions {
  filter?: string;
  severity?: LogSeverity;
  resourceType?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: "timestamp asc" | "timestamp desc";
}

export interface ListLogEntriesResponse {
  entries?: LogEntry[];
  nextPageToken?: string;
}

export async function listLogEntries(
  gcloudPath: string,
  projectId: string,
  options: ListLogEntriesOptions = {},
): Promise<ListLogEntriesResponse> {
  const url = `${LOGGING_API}/entries:list`;

  // Build filter string
  const filters: string[] = [];

  if (options.severity) {
    filters.push(`severity>=${options.severity}`);
  }

  if (options.resourceType) {
    filters.push(`resource.type="${options.resourceType}"`);
  }

  if (options.filter) {
    filters.push(options.filter);
  }

  const body = {
    resourceNames: [`projects/${projectId}`],
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    orderBy: options.orderBy || "timestamp desc",
    pageSize: options.pageSize || 100,
    pageToken: options.pageToken,
  };

  return gcpPost<ListLogEntriesResponse>(gcloudPath, url, body);
}

// Common resource types for filtering logs
export const LOG_RESOURCE_TYPES = [
  { value: "", label: "All Resources" },
  { value: "gce_instance", label: "Compute Engine" },
  { value: "cloud_run_revision", label: "Cloud Run" },
  { value: "gcs_bucket", label: "Cloud Storage" },
  { value: "cloud_function", label: "Cloud Functions" },
  { value: "k8s_container", label: "Kubernetes" },
  { value: "cloudsql_database", label: "Cloud SQL" },
  { value: "bigquery_resource", label: "BigQuery" },
  { value: "pubsub_topic", label: "Pub/Sub" },
] as const;

// ============================================================================
// Cloud Build API
// ============================================================================

export const CLOUDBUILD_API = "https://cloudbuild.googleapis.com/v1";

export type BuildStatus =
  | "STATUS_UNKNOWN"
  | "PENDING"
  | "QUEUED"
  | "WORKING"
  | "SUCCESS"
  | "FAILURE"
  | "INTERNAL_ERROR"
  | "TIMEOUT"
  | "CANCELLED"
  | "EXPIRED";

export interface BuildStep {
  name: string;
  args?: string[];
  env?: string[];
  dir?: string;
  id?: string;
  waitFor?: string[];
  entrypoint?: string;
  timeout?: string;
  status?: BuildStatus;
  timing?: {
    startTime?: string;
    endTime?: string;
  };
}

export interface BuildTrigger {
  id: string;
  name: string;
  description?: string;
  disabled?: boolean;
  createTime: string;
  substitutions?: Record<string, string>;
  filename?: string;
  includedFiles?: string[];
  ignoredFiles?: string[];
  triggerTemplate?: {
    projectId?: string;
    repoName?: string;
    branchName?: string;
    tagName?: string;
  };
  github?: {
    owner?: string;
    name?: string;
    push?: { branch?: string; tag?: string };
    pullRequest?: { branch?: string };
  };
  sourceToBuild?: {
    uri: string;
    ref: string;
    repoType: "GITHUB" | "CLOUD_SOURCE_REPOSITORIES" | "BITBUCKET_SERVER" | "GITLAB";
  };
  tags?: string[];
}

export interface Build {
  id: string;
  projectId: string;
  status: BuildStatus;
  statusDetail?: string;
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
    };
    gitSource?: {
      url: string;
      revision?: string;
    };
  };
  steps?: BuildStep[];
  results?: {
    images?: Array<{ name: string; digest: string }>;
    buildStepImages?: string[];
    artifactManifest?: string;
  };
  createTime: string;
  startTime?: string;
  finishTime?: string;
  timeout?: string;
  logUrl?: string;
  logsBucket?: string;
  options?: {
    machineType?: string;
    diskSizeGb?: string;
    logging?: string;
  };
  substitutions?: Record<string, string>;
  tags?: string[];
  buildTriggerId?: string;
}

export interface BuildOperation {
  name: string;
  done: boolean;
  metadata?: {
    "@type": string;
    build?: Build;
  };
  response?: Build;
  error?: {
    code: number;
    message: string;
  };
}

export async function listBuildTriggers(gcloudPath: string, projectId: string): Promise<BuildTrigger[]> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/triggers`;
  const response = await gcpFetch<{ triggers?: BuildTrigger[] }>(gcloudPath, url);
  return response.triggers || [];
}

export async function getBuildTrigger(gcloudPath: string, projectId: string, triggerId: string): Promise<BuildTrigger> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/triggers/${triggerId}`;
  return gcpFetch<BuildTrigger>(gcloudPath, url);
}

export interface CreateBuildTriggerRequest {
  name: string;
  description?: string;
  github?: {
    owner: string;
    name: string;
    push?: { branch: string };
    pullRequest?: { branch: string };
  };
  triggerTemplate?: {
    projectId?: string;
    repoName?: string;
    branchName?: string;
    tagName?: string;
  };
  filename?: string;
  build?: {
    steps: BuildStep[];
    images?: string[];
    timeout?: string;
  };
  substitutions?: Record<string, string>;
  includedFiles?: string[];
  ignoredFiles?: string[];
  disabled?: boolean;
  tags?: string[];
}

export async function createBuildTrigger(
  gcloudPath: string,
  projectId: string,
  trigger: CreateBuildTriggerRequest,
  location: string = "global",
): Promise<BuildTrigger> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/locations/${location}/triggers`;
  return gcpPost<BuildTrigger>(gcloudPath, url, trigger);
}

export async function deleteBuildTrigger(
  gcloudPath: string,
  projectId: string,
  triggerId: string,
  location: string = "global",
): Promise<void> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/locations/${location}/triggers/${triggerId}`;
  await gcpFetch<Record<string, never>>(gcloudPath, url, { method: "DELETE" });
}

export async function updateBuildTrigger(
  gcloudPath: string,
  projectId: string,
  triggerId: string,
  trigger: Partial<CreateBuildTriggerRequest>,
  location: string = "global",
): Promise<BuildTrigger> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/locations/${location}/triggers/${triggerId}`;
  return gcpFetch<BuildTrigger>(gcloudPath, url, {
    method: "PATCH",
    body: JSON.stringify(trigger),
  });
}

export async function runBuildTrigger(
  gcloudPath: string,
  projectId: string,
  triggerId: string,
  options?: {
    branchName?: string;
    tagName?: string;
    commitSha?: string;
    substitutions?: Record<string, string>;
  },
): Promise<BuildOperation> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/triggers/${triggerId}:run`;
  const body: {
    projectId: string;
    triggerId: string;
    source?: {
      branchName?: string;
      tagName?: string;
      commitSha?: string;
    };
    substitutions?: Record<string, string>;
  } = {
    projectId,
    triggerId,
  };

  if (options?.branchName || options?.tagName || options?.commitSha) {
    body.source = {};
    if (options.branchName) body.source.branchName = options.branchName;
    if (options.tagName) body.source.tagName = options.tagName;
    if (options.commitSha) body.source.commitSha = options.commitSha;
  }

  if (options?.substitutions) {
    body.substitutions = options.substitutions;
  }

  return gcpPost<BuildOperation>(gcloudPath, url, body);
}

export interface ListBuildsOptions {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
}

export async function listBuilds(
  gcloudPath: string,
  projectId: string,
  options?: ListBuildsOptions,
): Promise<{ builds: Build[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  if (options?.pageSize) params.set("pageSize", options.pageSize.toString());
  if (options?.pageToken) params.set("pageToken", options.pageToken);
  if (options?.filter) params.set("filter", options.filter);

  const queryString = params.toString();
  const url = `${CLOUDBUILD_API}/projects/${projectId}/builds${queryString ? `?${queryString}` : ""}`;
  const response = await gcpFetch<{ builds?: Build[]; nextPageToken?: string }>(gcloudPath, url);
  return {
    builds: response.builds || [],
    nextPageToken: response.nextPageToken,
  };
}

export async function getBuild(gcloudPath: string, projectId: string, buildId: string): Promise<Build> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/builds/${buildId}`;
  return gcpFetch<Build>(gcloudPath, url);
}

export async function cancelBuild(gcloudPath: string, projectId: string, buildId: string): Promise<Build> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/builds/${buildId}:cancel`;
  return gcpPost<Build>(gcloudPath, url, {});
}

export interface CreateBuildConfig {
  source?: {
    storageSource?: { bucket: string; object: string };
    repoSource?: {
      projectId?: string;
      repoName?: string;
      branchName?: string;
      tagName?: string;
      commitSha?: string;
    };
    gitSource?: { url: string; revision?: string };
  };
  steps?: BuildStep[];
  timeout?: string;
  substitutions?: Record<string, string>;
  tags?: string[];
}

export async function createBuild(
  gcloudPath: string,
  projectId: string,
  config: CreateBuildConfig,
): Promise<BuildOperation> {
  const url = `${CLOUDBUILD_API}/projects/${projectId}/builds`;
  return gcpPost<BuildOperation>(gcloudPath, url, config);
}

// ============================================================================
// GKE (Google Kubernetes Engine) API
// ============================================================================

export const GKE_API = "https://container.googleapis.com/v1";

export interface GKENodePool {
  name: string;
  status: string;
  config?: {
    machineType: string;
    diskSizeGb: number;
    diskType?: string;
    imageType?: string;
  };
  initialNodeCount: number;
  autoscaling?: {
    enabled: boolean;
    minNodeCount: number;
    maxNodeCount: number;
  };
  management?: {
    autoUpgrade: boolean;
    autoRepair: boolean;
  };
  version?: string;
}

export interface GKECluster {
  name: string;
  location: string;
  status: string;
  currentMasterVersion: string;
  currentNodeVersion?: string;
  currentNodeCount: number;
  endpoint: string;
  createTime: string;
  network: string;
  subnetwork: string;
  nodePools?: GKENodePool[];
  ipAllocationPolicy?: {
    useIpAliases: boolean;
    clusterIpv4CidrBlock?: string;
    servicesIpv4CidrBlock?: string;
  };
  masterAuthorizedNetworksConfig?: {
    enabled: boolean;
  };
  privateClusterConfig?: {
    enablePrivateNodes: boolean;
    enablePrivateEndpoint: boolean;
  };
  releaseChannel?: {
    channel: "UNSPECIFIED" | "RAPID" | "REGULAR" | "STABLE";
  };
}

export async function listGKEClusters(gcloudPath: string, projectId: string): Promise<GKECluster[]> {
  const url = `${GKE_API}/projects/${projectId}/locations/-/clusters`;
  const response = await gcpFetch<{ clusters?: GKECluster[] }>(gcloudPath, url);
  return response.clusters || [];
}

export async function getGKECluster(
  gcloudPath: string,
  projectId: string,
  location: string,
  clusterName: string,
): Promise<GKECluster> {
  const url = `${GKE_API}/projects/${projectId}/locations/${location}/clusters/${clusterName}`;
  return gcpFetch<GKECluster>(gcloudPath, url);
}

export async function listGKENodePools(
  gcloudPath: string,
  projectId: string,
  location: string,
  clusterName: string,
): Promise<GKENodePool[]> {
  const url = `${GKE_API}/projects/${projectId}/locations/${location}/clusters/${clusterName}/nodePools`;
  const response = await gcpFetch<{ nodePools?: GKENodePool[] }>(gcloudPath, url);
  return response.nodePools || [];
}

export interface GKEWorkload {
  name: string;
  namespace: string;
  kind: "Deployment" | "StatefulSet" | "DaemonSet" | "Job" | "CronJob" | "Pod";
  replicas?: {
    desired: number;
    ready: number;
    available?: number;
  };
  images: string[];
  creationTimestamp: string;
  status?: string;
}

// Note: Workload listing requires kubectl or Kubernetes API directly
// This is a placeholder for future implementation using kubectl commands
export async function getGKECredentials(
  gcloudPath: string,
  projectId: string,
  location: string,
  clusterName: string,
): Promise<void> {
  const quotedPath = gcloudPath.includes(" ") ? `"${gcloudPath}"` : gcloudPath;
  await execPromise(
    `${quotedPath} container clusters get-credentials ${clusterName} --zone=${location} --project=${projectId}`,
    { timeout: 30000 },
  );
}

// ============================================================================
// Cloud Functions v2 API
// ============================================================================

export type CloudFunctionState = "ACTIVE" | "FAILED" | "DEPLOYING" | "DELETING" | "UNKNOWN" | "STATE_UNSPECIFIED";

export interface CloudFunction {
  /** Full resource name: projects/{project}/locations/{location}/functions/{function} */
  name: string;
  /** User-provided description */
  description?: string;
  /** Current state of the function */
  state: CloudFunctionState;
  /** Build configuration */
  buildConfig?: {
    runtime?: string;
    entryPoint?: string;
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
    workerPool?: string;
    environmentVariables?: Record<string, string>;
    dockerRepository?: string;
  };
  /** Service configuration (runtime settings) */
  serviceConfig?: {
    uri?: string;
    service?: string;
    serviceAccountEmail?: string;
    timeoutSeconds?: number;
    availableMemory?: string;
    availableCpu?: string;
    minInstanceCount?: number;
    maxInstanceCount?: number;
    maxInstanceRequestConcurrency?: number;
    environmentVariables?: Record<string, string>;
    secretEnvironmentVariables?: Array<{
      key: string;
      projectId?: string;
      secret: string;
      version?: string;
    }>;
    vpcConnector?: string;
    vpcConnectorEgressSettings?: string;
    ingressSettings?: string;
    allTrafficOnLatestRevision?: boolean;
    revision?: string;
  };
  /** Event trigger configuration (for non-HTTP triggers) */
  eventTrigger?: {
    trigger?: string;
    triggerRegion?: string;
    eventType?: string;
    pubsubTopic?: string;
    serviceAccountEmail?: string;
    retryPolicy?: string;
    eventFilters?: Array<{
      attribute: string;
      value: string;
      operator?: string;
    }>;
    channel?: string;
  };
  labels?: Record<string, string>;
  createTime?: string;
  updateTime?: string;
  url?: string;
  kmsKeyName?: string;
  environment?: string;
  satisfiesPzs?: boolean;
  upgradeInfo?: {
    upgradeState?: string;
  };
}

/**
 * List all Cloud Functions in a project
 * Use "-" for location to list from all regions
 */
export async function listCloudFunctions(
  gcloudPath: string,
  projectId: string,
  location?: string,
): Promise<CloudFunction[]> {
  const loc = location || "-";
  const url = `${CLOUDFUNCTIONS_API}/projects/${projectId}/locations/${loc}/functions`;
  const response = await gcpFetch<{ functions?: CloudFunction[] }>(gcloudPath, url);
  return response.functions || [];
}

/**
 * Get a specific Cloud Function
 */
export async function getCloudFunction(
  gcloudPath: string,
  projectId: string,
  location: string,
  functionName: string,
): Promise<CloudFunction> {
  const url = `${CLOUDFUNCTIONS_API}/projects/${projectId}/locations/${location}/functions/${functionName}`;
  return gcpFetch<CloudFunction>(gcloudPath, url);
}

/**
 * Delete a Cloud Function
 */
export async function deleteCloudFunction(
  gcloudPath: string,
  projectId: string,
  location: string,
  functionName: string,
): Promise<void> {
  const url = `${CLOUDFUNCTIONS_API}/projects/${projectId}/locations/${location}/functions/${functionName}`;
  await gcpDelete(gcloudPath, url);
}

/**
 * Invoke an HTTP-triggered Cloud Function
 * Note: This calls the function's HTTP URL directly
 */
export async function invokeCloudFunction(
  gcloudPath: string,
  functionUrl: string,
  data?: unknown,
): Promise<{ statusCode: number; body: string }> {
  const token = await getAccessToken(gcloudPath);

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const body = await response.text();
  return { statusCode: response.status, body };
}
