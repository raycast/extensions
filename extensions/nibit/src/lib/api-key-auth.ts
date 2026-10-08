import { LocalStorage, OAuth } from "@raycast/api";

const generatedApiKeyClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Nibit API Key",
  providerIcon: "icon.png",
  providerId: "nibit-api-key",
  description: "Stores the generated Nibit API key used by Raycast.",
});

const LEGACY_GENERATED_API_KEY_STORAGE_KEY = "auth:generated-api-key";
const GENERATED_API_KEY_META_STORAGE_KEY = "auth:generated-api-key-meta";

export type GeneratedApiKeyMetadata = {
  userId: string;
  apiKeyId?: string;
  apiKeyPrefix?: string;
  platform?: string;
  createdAt: string;
};

export async function storeGeneratedApiKey(
  apiKey: string,
  metadata: Omit<GeneratedApiKeyMetadata, "createdAt">,
): Promise<void> {
  await Promise.all([
    generatedApiKeyClient.setTokens({ accessToken: apiKey }),
    LocalStorage.removeItem(LEGACY_GENERATED_API_KEY_STORAGE_KEY),
    LocalStorage.setItem(
      GENERATED_API_KEY_META_STORAGE_KEY,
      JSON.stringify({ ...metadata, createdAt: new Date().toISOString() }),
    ),
  ]);
}

export async function getGeneratedApiKey(): Promise<string | null> {
  const secureTokens = await generatedApiKeyClient.getTokens();
  if (secureTokens?.accessToken) return secureTokens.accessToken;

  // Migration path for development builds/users who signed in before generated
  // API keys were moved out of LocalStorage and into Raycast's secure OAuth store.
  const legacyApiKey = await LocalStorage.getItem<string>(LEGACY_GENERATED_API_KEY_STORAGE_KEY);
  if (legacyApiKey) {
    await generatedApiKeyClient.setTokens({ accessToken: legacyApiKey });
    await LocalStorage.removeItem(LEGACY_GENERATED_API_KEY_STORAGE_KEY);
  }
  return legacyApiKey ?? null;
}

export async function getGeneratedApiKeyMetadata(): Promise<GeneratedApiKeyMetadata | null> {
  const raw = await LocalStorage.getItem<string>(GENERATED_API_KEY_META_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GeneratedApiKeyMetadata;
  } catch {
    return null;
  }
}

export async function clearGeneratedApiKey(): Promise<void> {
  await Promise.all([
    generatedApiKeyClient.removeTokens(),
    LocalStorage.removeItem(LEGACY_GENERATED_API_KEY_STORAGE_KEY),
    LocalStorage.removeItem(GENERATED_API_KEY_META_STORAGE_KEY),
  ]);
}
