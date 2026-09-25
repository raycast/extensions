import type { Model } from "../type";
import { DEFAULT_MODEL } from "./model-defaults";
import { Catalog, commandIdFromModel, isCommandModel } from "./model-catalog";

// The catalog snapshot already projects every command to a model with a stable reference,
// so callers can use the resolved model in effect dependencies without memoizing it.
export type ChatCatalog = { catalog: Pick<Catalog, "models" | "commands">; models: Record<string, Model> };

export function initialModelId(explicit: Model | undefined, cachedId: string | undefined): string {
  return explicit?.id ?? cachedId ?? DEFAULT_MODEL.id;
}

export function selectedChatModel(snapshot: ChatCatalog, selectedId: string, fallback?: Model): Model {
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
    (fallback?.id === selectedId ? fallback : undefined) ??
    catalog.models.default ??
    DEFAULT_MODEL
  );
}

export function chatModelLabel(model: Model): string {
  return isCommandModel(model.id) ? `Command: ${model.name}` : model.name;
}

export function availableChatModels(snapshot: ChatCatalog, context?: Model): Model[] {
  const models = Object.values(snapshot.catalog.models);
  if (context && !snapshot.catalog.models[context.id]) models.push(selectedChatModel(snapshot, context.id, context));
  return models;
}
