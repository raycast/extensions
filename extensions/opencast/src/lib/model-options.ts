import type { ProviderListResponse } from "@opencode-ai/sdk/v2";
import type { ModelOption } from "./types";

export function mapProviderResponseToModels(response: ProviderListResponse): ModelOption[] {
  const defaults = response.default ?? {};
  const connected = new Set(response.connected ?? []);

  return response.all
    .flatMap((provider) =>
      Object.entries(provider.models).map(([modelID, model]) => ({
        providerID: provider.id,
        modelID,
        title: model.name || modelID,
        providerTitle: provider.name,
        subtitle: `${provider.id}/${modelID}`,
        isDefault: defaults[provider.id] === modelID,
        isConnected: connected.has(provider.id),
      })),
    )
    .sort((a, b) => {
      const score = (item: ModelOption) => {
        if (item.isConnected && item.isDefault) return 0;
        if (item.isConnected) return 1;
        if (item.isDefault) return 2;
        return 3;
      };
      const diff = score(a) - score(b);
      if (diff !== 0) {
        return diff;
      }
      return `${a.providerTitle}/${a.title}`.localeCompare(`${b.providerTitle}/${b.title}`);
    });
}
