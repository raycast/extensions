import { providerError } from "./errors";

export const OPENROUTER_USER_MODELS_BASE_URL = "https://openrouter.ai/api/v1/models/user";

export function buildUserModelsUrl({
  inputModalities = ["image"],
  outputModalities = ["text"],
}: {
  inputModalities?: string[];
  outputModalities?: string[];
} = {}): string {
  const url = new URL(OPENROUTER_USER_MODELS_BASE_URL);
  url.searchParams.set("input_modalities", inputModalities.join(","));
  url.searchParams.set("output_modalities", outputModalities.join(","));
  return url.toString();
}

export type ModelSort =
  | "recommended"
  | "name"
  | "price-low-to-high"
  | "price-high-to-low"
  | "newest"
  | "oldest"
  | "context-high-to-low";

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  architecture: {
    inputModalities: string[];
    outputModalities: string[];
    tokenizer?: string;
  };
  pricing: {
    prompt?: string;
    completion?: string;
  };
  contextLength?: number;
  createdAt?: number;
}

export async function fetchImageReadingModels({
  apiKey,
  searchText = "",
  sort = "recommended",
  fetchImplementation = fetch,
}: {
  apiKey: string;
  searchText?: string;
  sort?: ModelSort;
  fetchImplementation?: typeof fetch;
}): Promise<OpenRouterModel[]> {
  const response = await fetchImplementation(buildUserModelsUrl(), {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      "X-Title": "Extract Screenshot Text",
    },
  });

  const responseJson = await readResponseJson(response);

  if (!response.ok) {
    throw providerError(buildModelListErrorMessage(response.status, responseJson));
  }

  const imageReadingModels = parseOpenRouterModels(responseJson).filter(isImageReadingModel);

  return searchAndSortModels(imageReadingModels, {
    searchText,
    sort,
  });
}

export function parseOpenRouterModels(responseJson: unknown): OpenRouterModel[] {
  if (!isRecord(responseJson) || !Array.isArray(responseJson.data)) {
    throw providerError("OpenRouter didn't return a model list. Check your API key and try again.");
  }

  return responseJson.data.flatMap((model): OpenRouterModel[] => {
    if (!isRecord(model) || typeof model.id !== "string") {
      return [];
    }

    const architecture = isRecord(model.architecture) ? model.architecture : {};
    const pricing = isRecord(model.pricing) ? model.pricing : {};

    return [
      {
        id: model.id,
        name: typeof model.name === "string" ? model.name : model.id,
        description: typeof model.description === "string" ? model.description : "",
        architecture: {
          inputModalities: readStringArray(architecture.input_modalities),
          outputModalities: readStringArray(architecture.output_modalities),
          tokenizer: typeof architecture.tokenizer === "string" ? architecture.tokenizer : undefined,
        },
        pricing: {
          prompt: typeof pricing.prompt === "string" ? pricing.prompt : undefined,
          completion: typeof pricing.completion === "string" ? pricing.completion : undefined,
        },
        contextLength: typeof model.context_length === "number" ? model.context_length : undefined,
        createdAt: typeof model.created === "number" ? model.created : undefined,
      },
    ];
  });
}

export function isImageReadingModel(model: OpenRouterModel): boolean {
  return model.architecture.inputModalities.includes("image") && model.architecture.outputModalities.includes("text");
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  google: "Google",
  openai: "OpenAI",
  anthropic: "Anthropic",
  amazon: "Amazon",
  meta: "Meta",
  "meta-llama": "Meta",
  mistralai: "Mistral",
  qwen: "Qwen",
  "x-ai": "xAI",
  cohere: "Cohere",
  microsoft: "Microsoft",
  deepseek: "DeepSeek",
};

export function isRecommendedModel(model: OpenRouterModel): boolean {
  return isImageReadingModel(model) && Boolean(model.contextLength || model.createdAt);
}

export function getModelProviderSlug(model: OpenRouterModel): string {
  const [providerSlug] = model.id.replace(/^~/, "").split("/");
  return providerSlug ?? "other";
}

export function getModelPageUrl(model: OpenRouterModel): string {
  return `https://openrouter.ai/${model.id.replace(/^~/, "")}`;
}

export function getModelProviderName(model: OpenRouterModel): string {
  const providerSlug = getModelProviderSlug(model);
  return PROVIDER_DISPLAY_NAMES[providerSlug] ?? capitalize(providerSlug);
}

export function getModelPriceSummary(model: OpenRouterModel): string {
  if (isFreeModel(model)) {
    return "Free";
  }

  const inputPrice = formatPricePerMillionTokens(model.pricing.prompt);

  if (!inputPrice) {
    return "Pricing varies";
  }

  return `${inputPrice} in / 1M`;
}

export function getModelInputPriceLabel(model: OpenRouterModel): string {
  if (isFreeModel(model)) {
    return "Free";
  }

  return formatPricePerMillionTokens(model.pricing.prompt) ?? "Not listed";
}

export function getModelOutputPriceLabel(model: OpenRouterModel): string {
  if (isFreeModel(model)) {
    return "Free";
  }

  return formatPricePerMillionTokens(model.pricing.completion) ?? "Not listed";
}

export function getModelContextLabel(model: OpenRouterModel): string {
  if (!model.contextLength) {
    return "Not listed";
  }

  return `${model.contextLength.toLocaleString("en-US")} tokens`;
}

export function getModelReleaseLabel(model: OpenRouterModel): string {
  if (!model.createdAt) {
    return "Not listed";
  }

  return new Date(model.createdAt * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function searchAndSortModels(
  models: OpenRouterModel[],
  {
    searchText,
    sort,
  }: {
    searchText: string;
    sort: ModelSort;
  },
): OpenRouterModel[] {
  return sortModels(
    models.filter((model) => matchesSearch(model, searchText)),
    sort,
  );
}

export function sortModels(models: OpenRouterModel[], sort: ModelSort): OpenRouterModel[] {
  const sortedModels = [...models];

  switch (sort) {
    case "recommended":
      return sortedModels.sort(compareRecommendedModels);
    case "name":
      return sortedModels.sort((firstModel, secondModel) => firstModel.name.localeCompare(secondModel.name));
    case "price-low-to-high":
      return sortedModels.sort(
        (firstModel, secondModel) =>
          getSortableAveragePrice(firstModel) - getSortableAveragePrice(secondModel) ||
          firstModel.name.localeCompare(secondModel.name),
      );
    case "price-high-to-low":
      return sortedModels.sort(
        (firstModel, secondModel) =>
          getSortableAveragePrice(secondModel) - getSortableAveragePrice(firstModel) ||
          firstModel.name.localeCompare(secondModel.name),
      );
    case "newest":
      return sortedModels.sort(
        (firstModel, secondModel) =>
          getSortableCreatedAt(secondModel) - getSortableCreatedAt(firstModel) ||
          firstModel.name.localeCompare(secondModel.name),
      );
    case "oldest":
      return sortedModels.sort(
        (firstModel, secondModel) =>
          getSortableCreatedAt(firstModel) - getSortableCreatedAt(secondModel) ||
          firstModel.name.localeCompare(secondModel.name),
      );
    case "context-high-to-low":
      return sortedModels.sort(
        (firstModel, secondModel) =>
          getSortableContextLength(secondModel) - getSortableContextLength(firstModel) ||
          firstModel.name.localeCompare(secondModel.name),
      );
    default: {
      const exhaustiveCheck: never = sort;
      return exhaustiveCheck;
    }
  }
}

function matchesSearch(model: OpenRouterModel, searchText: string): boolean {
  const normalizedSearchText = searchText.trim().toLowerCase();

  if (!normalizedSearchText) {
    return true;
  }

  return [model.id, model.name, model.description, model.architecture.tokenizer]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalizedSearchText));
}

function isFreeModel(model: OpenRouterModel): boolean {
  return model.pricing.prompt === "0" && model.pricing.completion === "0";
}

function compareRecommendedModels(firstModel: OpenRouterModel, secondModel: OpenRouterModel): number {
  return (
    getSortableContextLength(secondModel) - getSortableContextLength(firstModel) ||
    getSortableCreatedAt(secondModel) - getSortableCreatedAt(firstModel) ||
    getSortableAveragePrice(firstModel) - getSortableAveragePrice(secondModel) ||
    firstModel.name.localeCompare(secondModel.name)
  );
}

function getSortableAveragePrice(model: OpenRouterModel): number {
  const promptPrice = getPricePerToken(model.pricing.prompt);
  const completionPrice = getPricePerToken(model.pricing.completion);

  if (promptPrice === undefined && completionPrice === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  if (promptPrice === undefined) {
    return completionPrice ?? Number.POSITIVE_INFINITY;
  }

  if (completionPrice === undefined) {
    return promptPrice;
  }

  return (promptPrice + completionPrice) / 2;
}

function getSortableCreatedAt(model: OpenRouterModel): number {
  return model.createdAt ?? 0;
}

function getSortableContextLength(model: OpenRouterModel): number {
  return model.contextLength ?? 0;
}

function getPricePerToken(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const price = Number(value);

  if (!Number.isFinite(price)) {
    return undefined;
  }

  return price;
}

function formatPricePerMillionTokens(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const pricePerToken = Number(value);

  if (!Number.isFinite(pricePerToken)) {
    return undefined;
  }

  const pricePerMillion = pricePerToken * 1_000_000;

  return `$${pricePerMillion.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: pricePerMillion < 1 ? 4 : 2,
  })}`;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw providerError("Couldn't read OpenRouter's model list. Try again.");
  }
}

function buildModelListErrorMessage(status: number, responseJson: unknown): string {
  const providerMessage = getProviderMessage(responseJson);

  if (status === 401 || status === 403) {
    return providerMessage || "OpenRouter didn't accept your API key. Check it and try again.";
  }

  return providerMessage || "OpenRouter couldn't load your available models. Try again.";
}

function getProviderMessage(responseJson: unknown): string | undefined {
  if (!isRecord(responseJson) || !isRecord(responseJson.error)) {
    return undefined;
  }

  return typeof responseJson.error.message === "string" ? responseJson.error.message : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
