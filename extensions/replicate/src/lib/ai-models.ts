import { AI, getPreferenceValues, LocalStorage } from "@raycast/api";
import { Model } from "../types";
import { DAY_MS, cached } from "./cache";
import { chatCapabilities, chatShape } from "./chat";
import { collectionModels, getModel, modelId } from "./replicate";

const KEPT_KEY = "ai-models-kept";
const HIDDEN_KEY = "ai-models-hidden";
const DEFAULTS_KEY = "ai-models-defaults";
const POPULAR_COLLECTIONS = ["text-to-image", "image-editing", "language-models"];
const POPULAR_PER_COLLECTION = 5;
const ICON = "replicate.png";

export type KeptModel = { id: string; addedAt?: number; usedAt?: number };

const readList = async <T>(key: string): Promise<T[]> => {
  try {
    const stored = await LocalStorage.getItem<string>(key);
    return stored ? (JSON.parse(stored) as T[]) : [];
  } catch {
    // Unreadable storage should cost the user's picks, not the whole model list.
    return [];
  }
};

const writeList = <T>(key: string, list: T[]) => LocalStorage.setItem(key, JSON.stringify(list));

export const keptModels = () => readList<KeptModel>(KEPT_KEY);

export const keptModelIds = async () => (await keptModels()).map((model) => model.id);

export const hiddenModelIds = () => readList<string>(HIDDEN_KEY);

type Inputs = Record<string, unknown>;

const readDefaults = async (): Promise<Record<string, Inputs>> => {
  try {
    const stored = await LocalStorage.getItem<string>(DEFAULTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const chatDefaults = async (id: string): Promise<Inputs> => (await readDefaults())[id] ?? {};

export const saveChatDefaults = async (id: string, inputs: Inputs) => {
  const all = { ...(await readDefaults()), [id]: inputs };
  if (!Object.keys(inputs).length) delete all[id];
  await LocalStorage.setItem(DEFAULTS_KEY, JSON.stringify(all));
};

export const fullModel = (id: string) => {
  const [owner, name] = id.split("/");
  return cached(`model:${id}`, DAY_MS, () => getModel(owner, name));
};

// Run counts are all-time, so official models go first to keep 2023 Stable Diffusion off the top.
const pickPopular = async (models: Model[]) => {
  const ordered = [...models.filter((model) => model.is_official), ...models.filter((model) => !model.is_official)];
  const picked: string[] = [];
  for (const model of ordered) {
    if (picked.length === POPULAR_PER_COLLECTION) break;
    // A collection model can arrive without its schema, which decides whether a chat can use it.
    const full = model.latest_version ? model : await fullModel(modelId(model)).catch(() => undefined);
    if (chatShape(full)) picked.push(modelId(model));
  }
  return picked;
};

export const popularModelIds = () =>
  cached("ai-models:popular-v2", DAY_MS, async () => {
    const lists = await Promise.all(POPULAR_COLLECTIONS.map(collectionModels));
    const picks = await Promise.all(lists.map(pickPopular));
    return [...new Set(picks.flat())];
  });

const register = (model: Model): AI.RegisteredModel | undefined => {
  const shape = chatShape(model);
  if (!shape) return undefined;
  const id = modelId(model);
  return {
    id,
    title: model.name,
    description: model.description ? `${id} — ${model.description}` : id,
    icon: ICON,
    capabilities: chatCapabilities(shape),
  };
};

const registerById = (id: string) =>
  fullModel(id)
    .then(register)
    .catch(() => undefined);

export const pickerModelIds = async () => {
  const { popularModels } = getPreferenceValues<Preferences>();
  const [kept, hidden, popular] = await Promise.all([
    keptModelIds(),
    hiddenModelIds(),
    popularModels ? popularModelIds().catch((): string[] => []) : [],
  ]);
  return { kept, popular: popular.filter((id) => !hidden.includes(id) && !kept.includes(id)) };
};

export const registeredModels = async () => {
  const { kept, popular } = await pickerModelIds();
  // Dropping a model the user added or chatted with would break those chats.
  const yours = await Promise.all(
    kept.map(async (id) => (await registerById(id)) ?? { id, title: id.split("/")[1] ?? id, icon: ICON }),
  );
  const others = await Promise.all(popular.map(registerById));
  return [...yours, ...others.filter((model): model is AI.RegisteredModel => Boolean(model))];
};

const keep = async (id: string, stamp: Omit<KeptModel, "id">) => {
  const kept = await keptModels();
  const known = kept.some((model) => model.id === id);
  await writeList(
    KEPT_KEY,
    known ? kept.map((model) => (model.id === id ? { ...model, ...stamp } : model)) : [...kept, { id, ...stamp }],
  );
};

export const addModel = (id: string) => keep(id, { addedAt: Date.now() });

export const recordUse = (id: string) => keep(id, { usedAt: Date.now() });

export const hideModel = async (id: string) => {
  const hidden = await hiddenModelIds();
  if (!hidden.includes(id)) await writeList(HIDDEN_KEY, [...hidden, id]);
};

export const unhideModel = async (id: string) =>
  writeList(
    HIDDEN_KEY,
    (await hiddenModelIds()).filter((entry) => entry !== id),
  );

export const removeModel = async (id: string) => {
  await writeList(
    KEPT_KEY,
    (await keptModels()).filter((model) => model.id !== id),
  );
  // Without the hide, a popular model the user removed returns on the next daily refresh.
  const popular = await popularModelIds().catch((): string[] => []);
  if (popular.includes(id)) await hideModel(id);
};

export const refreshAIModels = async () => {
  try {
    await AI.refreshModels();
  } catch {
    // The stored change stands either way; Raycast also re-reads models on its own schedule.
  }
};
