export interface Provider {
  name: string;
  url: string;
  category: string;
  domain: string;
  variables?: ProviderVariable[];
}

export interface ProviderVariable {
  key: string;
  label: string;
  placeholder?: string;
}

export const faviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export const providersApiUrl = "https://creds.raggle.co/api.json";

export async function fetchProviders() {
  const response = await fetch(providersApiUrl);

  if (!response.ok) {
    throw new Error(`Failed to load providers: ${response.status}`);
  }

  return (await response.json()) as Provider[];
}

export const providerStorageKey = (provider: Provider, variableKey: string) =>
  `provider-url-variable:${provider.name}:${variableKey}`;

export const hasUrlVariables = (provider: Provider) =>
  Boolean(provider.variables?.length);

export const resolveProviderUrl = (
  provider: Provider,
  values: Record<string, string>,
) =>
  provider.url.replaceAll(/\{([^}]+)\}/g, (_, key: string) =>
    encodeURIComponent(values[key] ?? ""),
  );
