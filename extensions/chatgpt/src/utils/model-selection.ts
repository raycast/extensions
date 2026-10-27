import type { Model } from "../type";
import { DEFAULT_MODEL } from "./model-defaults";
import { Catalog, commandIdFromModel, isCommandModel } from "./model-catalog";
import { isModelId } from "./model-support";

// The catalog snapshot already projects every command to a model with a stable reference,
// so callers can use the resolved model in effect dependencies without memoizing it.
export type ChatCatalog = { catalog: Pick<Catalog, "models" | "commands">; models: Record<string, Model> };

export function initialModelId(explicit: Model | undefined, cachedId: string | undefined): string {
  return explicit?.id ?? cachedId ?? DEFAULT_MODEL.id;
}

const providerModelCache = new Map<string, Model>();

export function providerChatModel(option: string): Model {
  let model = providerModelCache.get(option);
  if (!model) {
    model = { ...DEFAULT_MODEL, id: option, name: option, option };
    providerModelCache.set(option, model);
  }
  return model;
}

export function isProviderChatModel(model: Model): boolean {
  return providerModelCache.get(model.id) === model;
}

export function selectedChatModel(
  snapshot: ChatCatalog,
  selectedId: string,
  fallback?: Model,
  availableOptions: string[] = [],
): Model {
  const { catalog, models } = snapshot;
  const commandId = commandIdFromModel(selectedId);
  if (commandId !== undefined) {
    // A command belongs in Ask only when it is part of this conversation.
    if (fallback?.id === selectedId) return models[selectedId] ?? fallback;
    const command = catalog.commands[commandId];
    const baseId = command?.configurationMode !== "independent" ? command?.baseModelId : undefined;
    return (baseId ? catalog.models[baseId] : undefined) ?? catalog.models.default ?? DEFAULT_MODEL;
  }
  return (
    catalog.models[selectedId] ??
    (availableOptions.includes(selectedId) && isModelId(selectedId) ? providerChatModel(selectedId) : undefined) ??
    (fallback?.id === selectedId ? fallback : undefined) ??
    catalog.models.default ??
    DEFAULT_MODEL
  );
}

export function chatModelLabel(model: Model): string {
  return isCommandModel(model.id) ? `Command: ${model.name}` : model.name;
}

export function availableChatModels(snapshot: ChatCatalog, context?: Model, availableOptions: string[] = []): Model[] {
  const models = Object.values(snapshot.catalog.models);
  for (const option of availableOptions) {
    if (isModelId(option) && !models.some((model) => model.id === option)) models.push(providerChatModel(option));
  }
  if (context && !snapshot.catalog.models[context.id]) models.push(selectedChatModel(snapshot, context.id, context));
  return models.filter((model, index, all) => all.findIndex((item) => item.id === model.id) === index);
}
