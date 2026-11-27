import { Color, LocalStorage } from "@raycast/api";
import { authorizeModelProvider } from "../lib/oauth";
import { AUTO_MODEL_ID, createCopilotInferenceProvider, type KeyValueStorage } from "./inference-core";

const MODEL_ICON = { source: "copilot.svg", tintColor: Color.PrimaryText };

const localStorageAdapter: KeyValueStorage = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: (key) => LocalStorage.removeItem(key),
  allKeys: async () => Object.keys(await LocalStorage.allItems()),
};

const inferenceProvider = createCopilotInferenceProvider({
  authorize: authorizeModelProvider,
  storage: localStorageAdapter,
  modelIcon: MODEL_ICON,
});

export { AUTO_MODEL_ID };
export const getCopilotModels = inferenceProvider.getCopilotModels;
export const streamCopilotCompletion = inferenceProvider.streamCopilotCompletion;
export const clearInferenceCache = inferenceProvider.clearCache;
