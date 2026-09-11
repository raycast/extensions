import { Models, type Model as ApiModel, type ProviderMap } from "@opencode-ai/models";
import { Model, Provider, ModelsData } from "./types";

export const LOGO_BASE_URL = "https://models.dev/logos";

const modelsClient = Models.make();

export async function fetchModelsData(): Promise<ModelsData> {
  const raw = await modelsClient.providers();
  return transformApiResponse(raw);
}

export function getProviderLogoUrl(providerId: string): string {
  return `${LOGO_BASE_URL}/${providerId}.svg`;
}

export function transformApiResponse(data: ProviderMap): ModelsData {
  const providers: Provider[] = [];
  const models: Model[] = [];

  for (const [providerId, rawProvider] of Object.entries(data)) {
    const modelEntries = Object.entries(rawProvider.models);

    providers.push({
      id: providerId,
      name: rawProvider.name,
      doc: rawProvider.doc,
      modelCount: modelEntries.length,
      logo: getProviderLogoUrl(providerId),
    });

    for (const [modelId, rawModel] of modelEntries) {
      models.push(transformModel(rawModel, modelId, providerId, rawProvider.name, rawProvider.doc));
    }
  }

  // Sort providers alphabetically
  providers.sort((a, b) => a.name.localeCompare(b.name));

  // Sort models by provider name, then model name
  models.sort((a, b) => {
    const providerCompare = a.providerName.localeCompare(b.providerName);
    if (providerCompare !== 0) return providerCompare;
    return a.name.localeCompare(b.name);
  });

  return { providers, models };
}

function transformModel(
  raw: ApiModel,
  modelId: string,
  providerId: string,
  providerName: string,
  providerDoc?: string,
): Model {
  return {
    id: modelId,
    name: raw.name,
    description: raw.description,
    family: raw.family,
    providerId,
    providerName,
    providerLogo: getProviderLogoUrl(providerId),
    providerDoc,

    // Capabilities (default to false if undefined)
    attachment: raw.attachment ?? false,
    reasoning: raw.reasoning ?? false,
    tool_call: raw.tool_call ?? false,
    structured_output: raw.structured_output ?? false,
    temperature: raw.temperature ?? false,

    // Metadata
    knowledge: raw.knowledge,
    release_date: raw.release_date,
    open_weights: raw.open_weights ?? false,
    status: raw.status,

    // Modalities
    modalities: raw.modalities ?? { input: ["text"], output: ["text"] },

    // Pricing
    cost: raw.cost,

    // Limits
    limit: raw.limit,
  };
}
