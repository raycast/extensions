import { LocalStorage, getPreferenceValues } from "@raycast/api";

const KEYS = {
  INSTALLATION_TOKEN: "bunq_installation_token",
  SERVER_PUBLIC_KEY: "bunq_server_public_key",
  DEVICE_ID: "bunq_device_id",
  SESSION_TOKEN: "bunq_session_token",
  USER_ID: "bunq_user_id",
  RSA_PUBLIC_KEY: "bunq_rsa_public_key",
  RSA_PRIVATE_KEY: "bunq_rsa_private_key",
  API_KEY_FINGERPRINT: "bunq_api_key_fingerprint",
  STORED_ENVIRONMENT: "bunq_stored_environment",
} as const;

export interface BunqCredentials {
  apiKey: string;
  installationToken: string;
  serverPublicKey: string;
  deviceId: string;
  sessionToken: string;
  userId: string;
  rsaPublicKey: string;
  rsaPrivateKey: string;
}

/**
 * Gets the API key from Raycast preferences
 */
export function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey;
}

export async function getInstallationToken(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.INSTALLATION_TOKEN);
}

export async function setInstallationToken(token: string): Promise<void> {
  await LocalStorage.setItem(KEYS.INSTALLATION_TOKEN, token);
}

export async function getServerPublicKey(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.SERVER_PUBLIC_KEY);
}

export async function setServerPublicKey(key: string): Promise<void> {
  await LocalStorage.setItem(KEYS.SERVER_PUBLIC_KEY, key);
}

export async function getDeviceId(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.DEVICE_ID);
}

export async function setDeviceId(deviceId: string): Promise<void> {
  await LocalStorage.setItem(KEYS.DEVICE_ID, deviceId);
}

export async function getSessionToken(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.SESSION_TOKEN);
}

export async function setSessionToken(token: string): Promise<void> {
  await LocalStorage.setItem(KEYS.SESSION_TOKEN, token);
}

export async function getUserId(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.USER_ID);
}

export async function setUserId(userId: string): Promise<void> {
  await LocalStorage.setItem(KEYS.USER_ID, userId);
}

export async function getRsaPublicKey(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.RSA_PUBLIC_KEY);
}

export async function setRsaPublicKey(key: string): Promise<void> {
  await LocalStorage.setItem(KEYS.RSA_PUBLIC_KEY, key);
}

export async function getRsaPrivateKey(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.RSA_PRIVATE_KEY);
}

export async function setRsaPrivateKey(key: string): Promise<void> {
  await LocalStorage.setItem(KEYS.RSA_PRIVATE_KEY, key);
}

/**
 * Checks if the extension is fully configured with valid session
 */
export async function isConfigured(): Promise<boolean> {
  const apiKey = getApiKey();
  const [sessionToken, userId] = await Promise.all([getSessionToken(), getUserId()]);
  return !!(apiKey && sessionToken && userId);
}

/**
 * Checks if initial setup has been completed (device registered)
 */
export async function hasCompletedSetup(): Promise<boolean> {
  const apiKey = getApiKey();
  const [installationToken, deviceId] = await Promise.all([getInstallationToken(), getDeviceId()]);
  return !!(apiKey && installationToken && deviceId);
}

export async function getAllCredentials(): Promise<Partial<BunqCredentials>> {
  const apiKey = getApiKey();
  const [installationToken, serverPublicKey, deviceId, sessionToken, userId, rsaPublicKey, rsaPrivateKey] =
    await Promise.all([
      getInstallationToken(),
      getServerPublicKey(),
      getDeviceId(),
      getSessionToken(),
      getUserId(),
      getRsaPublicKey(),
      getRsaPrivateKey(),
    ]);

  const result: Partial<BunqCredentials> = {};
  if (apiKey !== undefined) result.apiKey = apiKey;
  if (installationToken !== undefined) result.installationToken = installationToken;
  if (serverPublicKey !== undefined) result.serverPublicKey = serverPublicKey;
  if (deviceId !== undefined) result.deviceId = deviceId;
  if (sessionToken !== undefined) result.sessionToken = sessionToken;
  if (userId !== undefined) result.userId = userId;
  if (rsaPublicKey !== undefined) result.rsaPublicKey = rsaPublicKey;
  if (rsaPrivateKey !== undefined) result.rsaPrivateKey = rsaPrivateKey;
  return result;
}

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => LocalStorage.removeItem(key)));
}

// Lazy import to avoid circular dependencies
let sha256HashFn: ((input: string) => string) | null = null;
async function getSha256Hash(): Promise<(input: string) => string> {
  if (!sha256HashFn) {
    const { sha256Hash } = await import("./crypto");
    sha256HashFn = sha256Hash;
  }
  return sha256HashFn;
}

/**
 * Creates a secure fingerprint of the API key using SHA-256 hash.
 * This allows detecting changes without storing any part of the actual key.
 */
async function createApiKeyFingerprint(apiKey: string): Promise<string> {
  if (!apiKey) return "";
  const hash = await getSha256Hash();
  return hash(apiKey);
}

/**
 * Gets the stored API key fingerprint (SHA-256 hash)
 */
export async function getApiKeyFingerprint(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.API_KEY_FINGERPRINT);
}

/**
 * Stores the API key fingerprint (SHA-256 hash)
 */
export async function setApiKeyFingerprint(apiKey: string): Promise<void> {
  const fingerprint = await createApiKeyFingerprint(apiKey);
  await LocalStorage.setItem(KEYS.API_KEY_FINGERPRINT, fingerprint);
}

/**
 * Gets the stored environment setting
 */
export async function getStoredEnvironment(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.STORED_ENVIRONMENT);
}

/**
 * Stores the current environment setting
 */
export async function setStoredEnvironment(environment: string): Promise<void> {
  await LocalStorage.setItem(KEYS.STORED_ENVIRONMENT, environment);
}

/**
 * Gets the current environment from preferences
 */
export function getCurrentEnvironment(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.environment;
}

/**
 * Checks if the current preferences match what was used for stored credentials.
 * Returns false if API key or environment has changed, or if we're upgrading
 * from an older version that didn't store fingerprints.
 */
export async function credentialsMatchPreferences(): Promise<boolean> {
  const currentApiKey = getApiKey();
  const currentEnvironment = getCurrentEnvironment();

  const [storedFingerprint, storedEnvironment, installationToken] = await Promise.all([
    getApiKeyFingerprint(),
    getStoredEnvironment(),
    getInstallationToken(),
  ]);

  // If there are existing credentials but no fingerprint, we're upgrading from
  // an older version. Return false to trigger a fresh setup with proper fingerprinting.
  if (installationToken && (!storedFingerprint || !storedEnvironment)) {
    return false;
  }

  // If no stored fingerprint and no existing credentials, this is first time setup
  if (!storedFingerprint || !storedEnvironment) {
    return true;
  }

  const currentFingerprint = await createApiKeyFingerprint(currentApiKey);
  return storedFingerprint === currentFingerprint && storedEnvironment === currentEnvironment;
}
