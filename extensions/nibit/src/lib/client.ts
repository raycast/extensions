import { createSecureMessagingClient, type AuthSession, type PushItem } from "./secure";
import { getExtensionConfig } from "./config";
// Intentional circular dep: oauth.ts imports clearSecureDeviceData from this
// module. TypeScript CJS output uses property-access requires (module.exports),
// so both sides resolve correctly at call time despite the cycle.
import { getAuthSession } from "./oauth";
import { raycastSecureStore } from "./store";
import { fetchWithTimeout } from "./fetch";
import os from "os";
import { InputLimits } from "./inputLimits";

const DEFAULT_DEVICE_CAPABILITIES = [
  "secure_send",
  "secure_receive",
  "push_send",
  "push_receive",
  "blob_send",
  "blob_receive",
];

function deviceName(): string {
  return `Raycast on ${os.hostname()}`.substring(0, InputLimits.DEVICE_NAME);
}

// Module-level singleton so the device cache and bootstrap throttle are shared
// across all commands and operations within a single Raycast process lifetime.
// The client is rebuilt automatically if the effective extension config changes.
let _sharedClient: ReturnType<typeof createRaycastClient> | null = null;
let _sharedClientConfig: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  blobRelayUrl: string;
  authBridgeUrl: string;
} | null = null;

export function getSharedClient(): ReturnType<typeof createRaycastClient> {
  const { supabaseUrl, supabaseAnonKey, blobRelayUrl, authBridgeUrl } = getExtensionConfig();
  if (
    !_sharedClient ||
    !_sharedClientConfig ||
    _sharedClientConfig.supabaseUrl !== supabaseUrl ||
    _sharedClientConfig.supabaseAnonKey !== supabaseAnonKey ||
    _sharedClientConfig.blobRelayUrl !== blobRelayUrl ||
    _sharedClientConfig.authBridgeUrl !== authBridgeUrl
  ) {
    _sharedClient = createRaycastClient();
    _sharedClientConfig = { supabaseUrl, supabaseAnonKey, blobRelayUrl, authBridgeUrl };
  }
  return _sharedClient;
}

function resetSharedClient(): void {
  _sharedClient = null;
  _sharedClientConfig = null;
}

function createRaycastClient() {
  const { supabaseUrl, supabaseAnonKey, blobRelayUrl, authBridgeUrl } = getExtensionConfig();
  return createSecureMessagingClient({
    supabaseUrl,
    supabaseAnonKey,
    blobRelayUrl,
    apiBaseUrl: authBridgeUrl,
    sessionProvider: { getSession: getAuthSession },
    store: raycastSecureStore,
    deviceType: "desktop",
    deviceCapabilities: DEFAULT_DEVICE_CAPABILITIES,
    deviceName,
    deviceMetadata: {
      client_family: "nibit",
      client_kind: "raycast",
      platform: "macos",
      runtime: "app",
    },
    upgradeMessage: "Upgrade to Cloud Pro to continue using Nibit in Raycast.",
    onBootstrapForbidden: async () => {
      const session = await getAuthSession();
      if (!session) return;
      const response = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/get-entitlements`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            apikey: supabaseAnonKey,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
        10_000,
      ).catch((err) => {
        console.warn("[SecurePush] entitlement_refresh_failed", err);
        return null;
      });
      await response?.text().catch(() => {});
      if (!response?.ok) {
        throw new Error("entitlement_refresh_failed");
      }
    },
  });
}

export async function clearSecureDeviceData(options: { deactivateSession?: AuthSession | null } = {}): Promise<void> {
  const client = getSharedClient();
  resetSharedClient();
  await client.clearUserData(options);
}

export type RaycastPushItem = PushItem & {
  metadata: Record<string, string> | null;
};
