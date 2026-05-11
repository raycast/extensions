import { Color } from "@raycast/api";

/** An Auth0 user identity from a specific connection/provider. */
export interface Identity {
  provider: string;
  user_id: string;
  connection: string;
  isSocial: boolean;
}

/** An Auth0 user profile with login metadata and identity info. */
export interface User {
  user_id: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  identities?: Identity[];
  created_at: string;
  updated_at?: string;
  last_login?: string;
  last_ip?: string;
  logins_count?: number;
  blocked?: boolean;
}

/** Credentials needed to create an Auth0 ManagementClient for a tenant. */
export interface TenantConfig {
  name: string;
  domain: string;
  clientId: string;
  clientSecret: string;
}

/** The deployment environment label for a tenant. */
export type Environment = "Dev" | "Staging" | "Prod";

/** A configured Auth0 tenant with credentials, environment, and display color. */
export interface Tenant {
  id: string;
  name: string;
  environment: Environment;
  domain: string;
  clientId: string;
  clientSecret: string;
  color: Color;
}

/** An Auth0 organization with optional branding and metadata. */
export interface Organization {
  id: string;
  name: string;
  display_name?: string;
  branding?: {
    logo_url?: string;
    colors?: { primary?: string; page_background?: string };
  };
  metadata?: Record<string, string>;
}

/** A single Auth0 tenant log event (login, failure, API operation, etc.). */
export interface LogEntry {
  log_id?: string;
  date?: string;
  type?: string;
  description?: string;
  connection?: string;
  client_id?: string;
  client_name?: string;
  ip?: string;
  user_id?: string;
  user_name?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  location_info?: {
    country_name?: string;
    city_name?: string;
  };
}

/** An active Auth0 user session with device and expiration info. */
export interface Session {
  id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  authenticated_at?: string;
  idle_expires_at?: string;
  expires_at?: string;
  last_interacted_at?: string;
  device?: {
    initial_user_agent?: string;
    initial_ip?: string | null;
    last_user_agent?: string;
    last_ip?: string | null;
  };
  clients?: Array<{ client_id?: string }>;
}

/** An OAuth2 grant issued to a user for a specific audience/client. */
export interface UserGrant {
  id?: string;
  clientID?: string;
  user_id?: string;
  audience?: string;
  scope?: string[];
}

/** An Auth0 role assigned to a user. */
export interface Role {
  id: string;
  name: string;
  description?: string;
}

/** An Auth0 API (resource server) with its scopes and token settings. */
export interface ResourceServer {
  id: string;
  name?: string;
  identifier: string;
  scopes?: Array<{ value: string; description?: string }>;
  signing_alg?: string;
  signing_secret?: string;
  allow_offline_access?: boolean;
  skip_consent_for_verifiable_first_party_clients?: boolean;
  token_lifetime?: number;
  token_lifetime_for_web?: number;
  token_dialect?: string;
  enforce_policies?: boolean;
}

/** An Auth0 connection (database, social, enterprise, etc.). */
export interface Connection {
  id: string;
  name: string;
  display_name?: string;
  strategy: string;
  enabled_clients?: string[];
  is_domain_connection?: boolean;
  realms?: string[];
  metadata?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

/** An Auth0 application (client) with its configuration and allowed URLs. */
export interface Auth0App {
  client_id: string;
  name?: string;
  description?: string;
  app_type?: string;
  logo_uri?: string;
  is_first_party?: boolean;
  callbacks?: string[];
  allowed_origins?: string[];
  web_origins?: string[];
  allowed_logout_urls?: string[];
  grant_types?: string[];
  token_endpoint_auth_method?: string;
  client_metadata?: Record<string, string>;
}
