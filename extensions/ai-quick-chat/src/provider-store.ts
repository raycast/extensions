import { LocalStorage } from "@raycast/api";
import type { ModelSelection, ProviderProfile } from "./types";

const PROVIDERS_KEY = "provider-profiles-v1";
const ACTIVE_SELECTION_KEY = "active-model-selection-v1";

export async function getProviders(): Promise<ProviderProfile[]> {
  const stored = await LocalStorage.getItem<string>(PROVIDERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ProviderProfile[];
  } catch {
    return [];
  }
}

export async function getProvider(
  id: string,
): Promise<ProviderProfile | undefined> {
  return (await getProviders()).find((provider) => provider.id === id);
}

export async function saveProvider(profile: ProviderProfile): Promise<void> {
  const providers = await getProviders();
  const existingIndex = providers.findIndex(
    (provider) => provider.id === profile.id,
  );
  if (existingIndex >= 0) providers[existingIndex] = profile;
  else providers.push(profile);
  await LocalStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));

  const selection = await getActiveSelection();
  if (!selection || selection.providerId === profile.id) {
    await setActiveSelection({
      providerId: profile.id,
      modelId: profile.defaultModelId,
    });
  }
}

export async function deleteProvider(id: string): Promise<void> {
  const providers = (await getProviders()).filter(
    (provider) => provider.id !== id,
  );
  await LocalStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
  const selection = await getActiveSelection();
  if (selection?.providerId === id) {
    const replacement = providers[0];
    if (replacement) {
      await setActiveSelection({
        providerId: replacement.id,
        modelId: replacement.defaultModelId,
      });
    } else {
      await LocalStorage.removeItem(ACTIVE_SELECTION_KEY);
    }
  }
}

export async function getActiveSelection(): Promise<
  ModelSelection | undefined
> {
  const stored = await LocalStorage.getItem<string>(ACTIVE_SELECTION_KEY);
  if (!stored) return undefined;
  try {
    return JSON.parse(stored) as ModelSelection;
  } catch {
    return undefined;
  }
}

export async function setActiveSelection(
  selection: ModelSelection,
): Promise<void> {
  await LocalStorage.setItem(ACTIVE_SELECTION_KEY, JSON.stringify(selection));
}

export async function resolveActiveModel(): Promise<
  { provider: ProviderProfile; modelId: string } | undefined
> {
  const providers = await getProviders();
  if (providers.length === 0) return undefined;
  const selection = await getActiveSelection();
  const provider =
    providers.find((item) => item.id === selection?.providerId) ?? providers[0];
  if (!provider) return undefined;
  const requestedModel =
    selection?.providerId === provider.id ? selection.modelId : undefined;
  const modelId = requestedModel || provider.defaultModelId;
  return { provider, modelId };
}
