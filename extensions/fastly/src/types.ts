export interface FastlyVersion {
  number: number;
  active: boolean;
  locked: boolean;
  deployed: boolean;
  staging: boolean;
  testing: boolean;
  created_at: string;
  updated_at: string;
  domains: Array<{ name: string }>; // Make sure this exists
}

export interface FastlyServiceDetails extends FastlyService {
  active_version: number;
  versions: FastlyVersion[];
}

export interface FastlyService {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface FastlyCustomer {
  id: string;
  name: string;
  pricing_plan: string;
  created_at: string;
  updated_at: string;
}

export interface FastlyStats {
  // Common stats
  requests?: number;
  errors?: number;
  status_2xx?: number;
  status_3xx?: number;
  status_4xx?: number;
  status_5xx?: number;
  bandwidth?: number;

  // CDN-specific stats
  hits?: number;
  miss?: number;
  hit_ratio?: number;
  shield?: number;

  // Compute-specific stats
  compute_requests?: number;
  compute_execution_time_ms?: number;
}

// Supported roles in Fastly
export type FastlyRole = "user" | "billing" | "engineer" | "superuser";

// Request structure for team invitations
interface ServiceInvitation {
  type: "service_invitation";
  id: string;
}

export interface FastlyInvitationRequest {
  data: {
    type: "invitation";
    attributes: {
      email: string;
      limit_services: boolean;
      role: FastlyRole;
      status_code: null;
    };
    relationships: {
      customer: {
        data: {
          type: "customer";
          id: string;
        };
      };
      service_invitations: {
        data: ServiceInvitation[];
      };
    };
  };
}

export interface CreateServiceResponse {
  data: {
    id: string;
    type: "service";
    attributes: {
      name: string;
      type: "wasm" | "vcl";
    };
  };
}

// Response structure from invitation endpoint
export interface FastlyInvitationResponse {
  data: {
    id: string;
    type: "invitation";
    attributes: {
      email: string;
      role: FastlyRole;
      status: "pending" | "accepted" | "declined";
      created_at: string;
      updated_at: string;
    };
  };
}

// Parameters for inviting team members
export interface InviteTeamMemberParams {
  email: string;
  role: FastlyRole;
  name: string;
}

// Error response from Fastly API
export interface FastlyErrorResponse {
  detail: string;
  status: number;
  title: string;
}

// ACL types (Compute/Edge ACLs via /resources/acls)
export interface ComputeACL {
  id: string;
  name: string;
}

export interface ComputeACLListResponse {
  data: ComputeACL[];
  meta: {
    total: number;
  };
}

export interface ComputeACLEntry {
  prefix: string;
  action: "ALLOW" | "BLOCK";
}

export interface ComputeACLEntriesResponse {
  entries: ComputeACLEntry[];
  meta: {
    limit: number;
    next_cursor?: string;
  };
}

export interface ComputeACLBulkEntry {
  op: "create" | "update" | "delete";
  prefix: string;
  action?: "ALLOW" | "BLOCK";
}

// Secret Store types
export interface SecretStore {
  id: string;
  name: string;
  created_at: string;
}

export interface SecretStoreListResponse {
  data: SecretStore[];
  meta: {
    limit: number;
    next_cursor?: string;
  };
}

export interface SecretStoreSecret {
  name: string;
  created_at: string;
  recreated_at?: string;
}

export interface SecretStoreSecretsResponse {
  data: SecretStoreSecret[];
  meta: {
    limit: number;
    next_cursor?: string;
  };
}

// Config Store types
export interface ConfigStore {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Config Store list endpoint returns a plain array
export type ConfigStoreListResponse = ConfigStore[];

export interface ConfigStoreItem {
  item_key: string;
  item_value: string;
  store_id: string;
  created_at: string;
  updated_at: string;
}

// Config Store items endpoint returns a plain array
export type ConfigStoreItemsResponse = ConfigStoreItem[];

// KV Store types
export interface KVStore {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface KVStoreListResponse {
  data: KVStore[];
  meta: {
    limit: number;
    next_cursor?: string;
  };
}

export interface KVStoreKeysResponse {
  data: string[];
  meta: {
    limit: number;
    next_cursor?: string;
  };
}

// Audit Log / Events types (JSON:API format)
export interface AuditEvent {
  id: string;
  type: "event";
  attributes: {
    admin: boolean;
    created_at: string;
    customer_id: string;
    description: string;
    event_type: string;
    ip: string;
    metadata: Record<string, unknown>;
    service_id?: string;
    user_id?: string;
    token_id?: string;
  };
}

export interface AuditEventListResponse {
  data: AuditEvent[];
  links: {
    current?: string;
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
  meta: {
    current_page: number;
    per_page: number;
    record_count: number;
    total_pages: number;
  };
}

export interface AuditEventFilters {
  event_type?: string;
  service_id?: string;
  user_id?: string;
  created_at_start?: string;
  created_at_end?: string;
  page?: number;
  per_page?: number;
}

// AI Runtime Control (ARC) types

export interface ArcPaginationMeta {
  next_cursor?: string | null;
  limit?: number;
  sort?: string;
  total?: number;
}

export interface ArcModel {
  id: string;
  display_name: string;
  provider_id: string;
}

export interface ArcProvider {
  id: string;
  display_name: string;
  default_base_url: string;
  models: ArcModel[];
}

export interface ArcProvidersResponse {
  data: ArcProvider[];
  meta: { total: number };
}

export interface ArcVirtualKey {
  id: string;
  type?: string;
  name: string;
  model: string;
  provider: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  deleted_at?: string | null;
  last_used_at?: string | null;
  created_by?: string;
  security_enabled?: boolean | null;
  security_action?: string | null;
  rpm_limit?: number | null;
  tpm_limit?: number | null;
  spend_limit_enabled?: boolean;
}

export interface ArcVirtualKeyWithToken extends ArcVirtualKey {
  access_token: string;
  user_name?: string;
}

export interface ArcVirtualKeysResponse {
  data: ArcVirtualKey[];
  meta: ArcPaginationMeta;
}

export interface CreateArcVirtualKeyParams {
  name: string;
  model: string;
  provider: string;
  expires_at?: string;
  security_enabled?: boolean;
  security_action?: string;
  rpm_limit?: number;
  tpm_limit?: number;
}

export interface UpdateArcVirtualKeyParams {
  name?: string;
  model?: string;
  provider?: string;
  expires_at?: string;
  security_enabled?: boolean;
  security_action?: string;
  // null clears an existing limit; undefined leaves it unchanged
  rpm_limit?: number | null;
  tpm_limit?: number | null;
}

export interface ArcFailoverTarget {
  provider_connection_id: string;
}

export interface ArcKeyFailover {
  targets: ArcFailoverTarget[];
  timeout_enabled: boolean;
  rate_limit_429_enabled: boolean;
  server_error_5xx_enabled: boolean;
}

export interface ArcProviderConnection {
  id: string;
  name: string;
  models: string[];
  base_url?: string;
  auth_type?: "api-key" | "aws-iam";
  region?: string;
  created_at: string;
  updated_at: string;
}

export interface ArcProviderConnectionsResponse {
  data: ArcProviderConnection[];
  meta: ArcPaginationMeta;
}

export interface CreateArcProviderConnectionParams {
  name: string;
  models: string[];
  base_url?: string;
  api_key?: string;
  auth_type?: "api-key" | "aws-iam";
  customer_role_arn?: string;
  region?: string;
}

export interface UpdateArcProviderConnectionParams {
  models?: string[];
  base_url?: string;
  api_key?: string;
  customer_role_arn?: string;
  region?: string;
}

export type ArcUsageType = "requests" | "sessions" | "input_tokens" | "output_tokens" | "violations";

export interface ArcUsageMetric {
  date: string;
  usage_type: ArcUsageType;
  quantity: number;
  virtual_key_id?: string;
  virtual_key_name?: string;
  provider?: string;
  model?: string;
}

export interface ArcUsageMetricsResponse {
  data: ArcUsageMetric[];
  meta: ArcPaginationMeta;
}

export interface ArcSessionLog {
  request?: string;
  response?: string;
  attrs?: Record<string, unknown>;
}

export interface ArcSession {
  id: string;
  virtual_key_id?: string;
  virtual_key_name?: string;
  model?: string;
  provider?: string;
  requests?: number;
  input_tokens?: number;
  output_tokens?: number;
  created_at: string;
  updated_at?: string;
  logs?: ArcSessionLog[];
}

export interface ArcSessionsResponse {
  data: ArcSession[];
  meta: ArcPaginationMeta;
}

export interface ArcTimeRangeFilters {
  from?: string;
  to?: string;
  key?: string;
  provider?: string;
  model?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
}

// Bot Management types

export interface BotManagementServiceRef {
  id: string;
  object?: string;
  name?: string;
}

export interface BotManagementStatus {
  product?: { id: string; object?: string };
  service?: BotManagementServiceRef;
  configuration?: BotManagementConfiguration;
}

export interface BotManagementConfiguration {
  contentguard?: string;
}

export interface BotManagementEnabledServicesResponse {
  product?: { id: string; object?: string };
  customer?: { id: string; object?: string };
  services?: Array<string | BotManagementServiceRef>;
}

export interface BotStats {
  analyzed: number;
  detected: number;
  challenges_issued: number;
  challenges_succeeded: number;
  challenges_failed: number;
  byType: Record<string, number>;
}

// DDoS Protection types

export interface DdosProtectionConfiguration {
  mode?: string;
}

export interface DdosProtectionEvent {
  id: string;
  name?: string;
  customer_id?: string;
  service_id?: string;
  requests_allowed?: number;
  requests_detected?: number;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type DdosRuleAction = "default" | "block" | "log" | "off";

export interface DdosProtectionRule {
  id: string;
  name?: string;
  action?: DdosRuleAction | string;
  customer_id?: string;
  service_id?: string;
  source_ip?: string | null;
  source_ip_prefix?: string | null;
  country_code?: string | null;
  host?: string | null;
  asn?: string | null;
  additional_attributes?: string[];
  traffic_percentage?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DdosCursorMeta {
  next_cursor?: string | null;
  limit?: number;
}

export interface DdosEventsResponse {
  data?: DdosProtectionEvent[];
  meta?: DdosCursorMeta;
}

export interface DdosRulesResponse {
  data?: DdosProtectionRule[];
  meta?: DdosCursorMeta;
}

export interface DdosStats {
  requests: number;
  allowed: number;
  detected: number;
  mitigated: number;
}

// TLS types (JSON:API)

export interface TlsCertificate {
  id: string;
  attributes: {
    name?: string;
    issued_to?: string;
    issuer?: string;
    serial_number?: string;
    signature_algorithm?: string;
    not_before?: string | null;
    not_after?: string | null;
    created_at?: string | null;
  };
  relationships?: {
    tls_domains?: { data?: Array<{ id: string }> };
  };
}

export interface TlsSubscription {
  id: string;
  attributes: {
    state?: string;
    certificate_authority?: string;
    has_active_order?: boolean;
    created_at?: string | null;
  };
  relationships?: {
    tls_domains?: { data?: Array<{ id: string }> };
    common_name?: { data?: { id: string } };
  };
}

export interface TlsListResponse<T> {
  data?: T[];
  meta?: {
    current_page?: number;
    per_page?: number;
    record_count?: number;
    total_pages?: number;
  };
}

// Alerts types

export interface AlertEvaluationStrategy {
  type?: string;
  threshold?: number;
  period?: string;
  ignore_below?: number;
}

export interface AlertDefinition {
  id: string;
  name?: string;
  description?: string;
  service_id?: string;
  source?: string;
  metric?: string;
  dimensions?: Record<string, unknown>;
  evaluation_strategy?: AlertEvaluationStrategy;
  integration_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AlertHistoryEntry {
  id: string;
  definition_id?: string;
  definition?: AlertDefinition;
  status?: string;
  start?: string | null;
  end?: string | null;
}

export interface AlertListResponse<T> {
  data?: T[];
  meta?: {
    next_cursor?: string | null;
    limit?: number;
    total?: number;
  };
}

// Real-time stats types (rt.fastly.com)

export interface RealtimeEntry {
  recorded?: number;
  aggregated?: Record<string, number>;
}

export interface RealtimeResponse {
  Timestamp?: number;
  AggregateDelay?: number;
  Data?: RealtimeEntry[];
  Error?: string;
}

// Service version type (full shape from /service/{id}/version)

export interface ServiceVersion {
  number: number;
  active: boolean;
  staging?: boolean;
  testing?: boolean;
  locked: boolean;
  deployed?: boolean;
  comment?: string;
  created_at?: string;
  updated_at: string;
}
