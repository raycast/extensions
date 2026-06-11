export type { DeviceMetadata } from "./protocol";
import type { DeviceMetadata } from "./protocol";

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  display_name: string | null;
  device_type: string;
  public_key?: string | null;
  previous_public_key?: string | null;
  capabilities?: string[] | null;
  metadata?: DeviceMetadata | null;
  is_active?: boolean;
  last_seen_at: string;
  last_synced_at: string;
  created_at: string;
}

export interface PushItem {
  id: string;
  channel: string;
  content: string;
  content_type: string;
  title: string | null;
  source_device: string | null;
  target_device_id: string | null;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
  metadata: Record<string, string> | null;
}

export type SecureDeviceState = {
  id: string;
  publicKey: string;
  secretKey: string;
};

export type SecurePushPayload = {
  kind: "text" | "url";
  content: string;
  title: string | null;
};

export type SecureBlobPayload = {
  download_url: string;
  symmetric_key: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
};

export type EncryptedPendingMessage = {
  id: string;
  user_id: string;
  target_device_id: string;
  channel: string;
  message_type: string;
  sender_device_id: string;
  correlation_id: string | null;
  encrypted_payload: string;
  requires_auth: boolean;
  payload_schema_version: number;
  created_at: string;
  expires_at: string;
};

// Supabase REST and /v1 API polling still return pending_messages-shaped rows;
// keep this alias local to transport adapters while the public client boundary
// uses the transport-agnostic encrypted-message name above.
export type PendingMessageRow = EncryptedPendingMessage;

export type SecurePushInboxItem = PushItem & {
  transport: "secure";
  direction: "incoming" | "outgoing";
  sender_device_id: string;
};

export type ChannelDefinition = {
  id: "push" | "blob";
  persist_offline: boolean;
  default_ttl_seconds: number;
  max_message_size_bytes: number;
  description: string;
};

export type AuthSession = {
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  authType?: "api_key" | "supabase";
};

export interface AuthSessionProvider {
  getSession(): Promise<AuthSession | null>;
}

export interface SecureInboxStore<BlobHandle = unknown> {
  readMetaValue<T>(key: string): Promise<T | null>;
  writeMetaValue<T>(key: string, value: T): Promise<void>;
  clearMetaStore(): Promise<void>;
  upsertInboxItem(value: SecurePushInboxItem): Promise<void>;
  readInboxItem(id: string): Promise<SecurePushInboxItem | null>;
  deleteInboxItem(id: string): Promise<void>;
  clearInboxStore(): Promise<void>;
  listInboxItems(): Promise<SecurePushInboxItem[]>;
  writeBlobValue(
    key: string,
    bytes: Uint8Array,
    mimeType: string,
    fileName?: string,
    expiresAt?: string | null,
  ): Promise<void>;
  readBlobValue(key: string): Promise<BlobHandle | null>;
  deleteBlobValue(key: string): Promise<void>;
  clearBlobStore(): Promise<void>;
}

export interface SecureMessagingClientOptions<BlobHandle = unknown> {
  supabaseUrl: string;
  supabaseAnonKey: string;
  blobRelayUrl: string;
  apiBaseUrl?: string;
  sessionProvider: AuthSessionProvider;
  store: SecureInboxStore<BlobHandle>;
  deviceType: string;
  deviceCapabilities: string[];
  deviceName: string | (() => string);
  deviceMetadata?: DeviceMetadata | (() => DeviceMetadata);
  staleDeviceWindowMs?: number;
  /** Message shown when a devices-table 403/RLS error is detected (e.g. Cloud Pro required). Defaults to a generic push upgrade prompt. Pass a context-specific string when the client is used in Raycast, the web dashboard, etc. */
  upgradeMessage?: string;
  /** Called when bootstrapDevice receives a 403 on the devices table (entitlement check failed). Implementations should refresh the account_entitlements cache (e.g. call get-entitlements). Bootstrap retries once after this resolves. */
  onBootstrapForbidden?: () => Promise<void>;
}

export type SendSecurePushItemOptions = {
  title?: string;
  targetDeviceId?: string | null;
  kind?: "text" | "url";
  ttlHours?: number;
};

export type SendSecurePushFileOptions = {
  targetDeviceId?: string | null;
  fileName?: string;
  mimeType?: string;
  ttlHours?: number;
};

export type SendSecurePushResult = {
  error: string | null;
};

export interface SecureMessagingClient<BlobHandle = unknown> {
  bootstrapDevice(): Promise<SecureDeviceState | null>;
  readSecureDeviceId(): Promise<string | null>;
  fetchSecureDevices(): Promise<Device[]>;
  sendSecurePushItem(content: string, sendOptions?: SendSecurePushItemOptions): Promise<SendSecurePushResult>;
  sendSecurePushFile(bytes: Uint8Array, sendOptions?: SendSecurePushFileOptions): Promise<SendSecurePushResult>;
  syncSecurePushInbox(): Promise<SecurePushInboxItem[]>;
  ingestEncryptedPendingMessages(messages: EncryptedPendingMessage[]): Promise<SecurePushInboxItem[]>;
  decryptPendingMessageRow(row: PendingMessageRow): Promise<SecurePushInboxItem | null>;
  listSecurePushItems(): Promise<SecurePushInboxItem[]>;
  getStoredBlob(id: string): Promise<BlobHandle | null>;
  deleteSecurePushItem(id: string): Promise<void>;
  clearSecurePushItems(): Promise<void>;
  clearUserData(options?: { deactivateSession?: AuthSession | null }): Promise<void>;
}
