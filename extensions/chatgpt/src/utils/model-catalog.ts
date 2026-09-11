import type { Command, Model, ReasoningEffort } from "../type";
import { COMMAND_MODEL_PREFIX, DEFAULT_COMMANDS, DEFAULT_MODEL } from "./model-defaults";
import { resolveCommandSettings } from "./command-settings";

export const CATALOG_STORAGE_KEY = "model-command-catalog-v1";
export type Catalog = { version: 1; models: Record<string, Model>; commands: Record<string, Command> };
type StoredModel = Partial<Model> & Pick<Model, "id">;

export const isCommandModel = (id: string) => id.startsWith(`${COMMAND_MODEL_PREFIX}-`);
export const commandModelId = (id: string) => `${COMMAND_MODEL_PREFIX}-${id}`;
export const commandIdFromModel = (id: string) =>
  isCommandModel(id) ? id.slice(COMMAND_MODEL_PREFIX.length + 1) : undefined;

export function normalizeModel(model: StoredModel, timestamp: string): Model {
  const efforts: ReasoningEffort[] = ["none", "low", "medium", "high"];
  return {
    ...DEFAULT_MODEL,
    ...model,
    created_at: model.created_at || timestamp,
    updated_at: model.updated_at || timestamp,
    temperature: String(model.temperature ?? DEFAULT_MODEL.temperature),
    enableReasoningEffortChange: Boolean(model.enableReasoningEffortChange),
    reasoningEffort: efforts.includes(model.reasoningEffort!) ? model.reasoningEffort! : "medium",
    vision: model.vision ?? false,
    pinned: model.pinned ?? false,
  };
}

export function normalizeModels(stored: StoredModel[] | Record<string, StoredModel>, timestamp: string) {
  const models = Object.fromEntries(
    Object.values(stored)
      .filter((model) => !isCommandModel(model.id))
      .map((model) => [model.id, normalizeModel(model, timestamp)]),
  );
  models.default ??= normalizeModel(DEFAULT_MODEL, timestamp);
  return models;
}

// Legacy commands owned their chat parameters; preserve them as independent settings.
// Commands already linked to a base keep their existing inheritance relationship.
export function attachCommand(catalog: Catalog, command: Command, timestamp: string): Catalog {
  command = {
    ...command,
    configurationMode: command.configurationMode ?? (command.baseModelId ? "inherit" : "independent"),
    created_at: catalog.commands[command.id]?.created_at || command.created_at || timestamp,
    updated_at: timestamp,
  };
  if (command.configurationMode === "independent") {
    const independent = { ...command };
    delete independent.baseModelId;
    return { ...catalog, commands: { ...catalog.commands, [command.id]: independent } };
  }
  if (!command.baseModelId || !catalog.models[command.baseModelId]) {
    throw new Error("Choose an existing base model for this AI command.");
  }
  return { ...catalog, commands: { ...catalog.commands, [command.id]: command } };
}

export function migrateCatalog(
  storedModels: StoredModel[] | Record<string, StoredModel>,
  storedCommands: Record<string, Command>,
  timestamp: string,
): Catalog {
  let catalog: Catalog = { version: 1, models: normalizeModels(storedModels, timestamp), commands: {} };
  for (const command of Object.values({ ...DEFAULT_COMMANDS, ...storedCommands })) {
    catalog = attachCommand(catalog, command, timestamp);
  }
  return catalog;
}

export function mapCommandToModel(command: Command, models: Record<string, Model>): Model {
  const base = command.baseModelId ? models[command.baseModelId] : undefined;
  return {
    ...(base ?? DEFAULT_MODEL),
    ...resolveCommandSettings(command, base),
    id: commandModelId(command.id),
    name: command.name,
    created_at: command.created_at || base?.created_at || "",
    updated_at: command.updated_at || base?.updated_at || "",
    pinned: false,
  };
}

export function catalogModels(catalog: Catalog): Record<string, Model> {
  return {
    ...catalog.models,
    ...Object.fromEntries(
      Object.values(catalog.commands).map((cmd) => [commandModelId(cmd.id), mapCommandToModel(cmd, catalog.models)]),
    ),
  };
}

export function replaceModels(catalog: Catalog, models: Record<string, Model>): Catalog {
  const missing = Object.values(catalog.commands).filter(
    (cmd) => cmd.configurationMode !== "independent" && !models[cmd.baseModelId!],
  );
  if (missing.length) {
    throw new Error(
      `Model used by: ${missing.map((cmd) => cmd.name).join(", ")}. Choose another base model for these commands first.`,
    );
  }
  return { ...catalog, models };
}

type Storage = {
  getItem: (key: string) => Promise<string | undefined>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function createModelCatalog(storage: Storage, now: () => Date = () => new Date()) {
  let catalog: Catalog = { version: 1, models: {}, commands: {} };
  let snapshot = {
    catalog,
    models: {} as Record<string, Model>,
    isLoading: true,
    error: undefined as Error | undefined,
  };
  let loading: Promise<void> | undefined;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());
  const accept = (next: Catalog) => {
    catalog = next;
    snapshot = { catalog, models: catalogModels(catalog), isLoading: false, error: undefined };
    publish();
  };
  const load = () => {
    loading ??= (async () => {
      const saved = await storage.getItem(CATALOG_STORAGE_KEY);
      let next: Catalog;
      if (saved) {
        next = JSON.parse(saved);
        if (next.version !== 1) throw new Error("Unsupported model configuration version.");
      } else {
        const [models, commands] = await Promise.all([storage.getItem("models"), storage.getItem("commands")]);
        next = migrateCatalog(JSON.parse(models || "{}"), JSON.parse(commands || "{}"), now().toISOString());
        // One atomic value owns both collections. Keep legacy keys intact for rollback.
        await storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(next));
      }
      accept(next);
    })().catch((error) => {
      snapshot = { ...snapshot, isLoading: false, error: error instanceof Error ? error : new Error(String(error)) };
      publish();
      loading = undefined;
      throw error;
    });
    return loading;
  };
  const change = (update: (current: Catalog, timestamp: string) => Catalog) => {
    const result = writes.then(async () => {
      await load();
      const next = update(catalog, now().toISOString());
      catalogModels(next); // Validate references before persisting anything.
      await storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(next));
      accept(next);
    });
    writes = result.catch(() => {});
    return result;
  };
  return {
    load,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    saveModel: (model: Model) =>
      change((current, timestamp) => {
        if (isCommandModel(model.id)) throw new Error("Edit the source AI command instead.");
        return {
          ...current,
          models: { ...current.models, [model.id]: normalizeModel({ ...model, updated_at: timestamp }, timestamp) },
        };
      }),
    removeModel: (model: Model) =>
      change((current) => {
        if (model.id === DEFAULT_MODEL.id) throw new Error("The default model cannot be removed.");
        const models = { ...current.models };
        delete models[model.id];
        return replaceModels(current, models);
      }),
    setModels: (models: Record<string, Model>) =>
      change((current, timestamp) => replaceModels(current, normalizeModels(models, timestamp))),
    importModels: (models: StoredModel[] | Record<string, StoredModel>) =>
      change((current, timestamp) => {
        const imported = Object.fromEntries(Object.values(models).map((model) => [model.id, model]));
        for (const command of Object.values(current.commands)) {
          if (command.configurationMode !== "independent" && command.baseModelId) {
            imported[command.baseModelId] ??= current.models[command.baseModelId];
          }
        }
        return replaceModels(current, normalizeModels(imported, timestamp));
      }),
    saveCommand: (command: Command) => change((current, timestamp) => attachCommand(current, command, timestamp)),
    removeCommand: (command: Command) =>
      change((current) => {
        const commands = { ...current.commands };
        delete commands[command.id];
        return { ...current, commands };
      }),
    setCommands: (commands: Record<string, Command>) =>
      change((current, timestamp) =>
        Object.values(commands).reduce((next, command) => attachCommand(next, command, timestamp), {
          ...current,
          commands: {},
        }),
      ),
    resolveModel: (command: Command) => mapCommandToModel(command, catalog.models),
  };
}

export type ModelCatalogStore = ReturnType<typeof createModelCatalog>;
