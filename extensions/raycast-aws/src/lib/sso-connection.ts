import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "sso-connection-last-used";
// Used by the Login command before it shared this state with Populate; kept as a fallback so
// anyone who ran it previously still gets their start URL/region picked up automatically.
const LEGACY_STORAGE_KEY = "sso-login-last-used";

export interface SsoConnection {
  startUrl: string;
  region: string;
}

/** SSO start URL/region are shared between the Login and Populate commands so either one fills in the other. */
export async function getLastSsoConnection(): Promise<Partial<SsoConnection>> {
  const stored =
    (await LocalStorage.getItem<string>(STORAGE_KEY)) ??
    (await LocalStorage.getItem<string>(LEGACY_STORAGE_KEY));
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Partial<SsoConnection>;
  } catch {
    return {};
  }
}

export async function saveLastSsoConnection(
  connection: SsoConnection,
): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
}
