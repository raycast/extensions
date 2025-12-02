import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Model, ModelHook } from "../type";
import { useGrokAPI, fetchModels } from "./useGrokAPI";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

export const DEFAULT_MODEL: Model = {
  id: "grok-3-mini-beta",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Grok 3 Mini Beta",
  prompt: "You are Grok 3, a powerful AI assistant created by xAI.",
  option: "grok-3-mini-beta",
  temperature: "1",
  pinned: false,
};

// Additional models
const ADDITIONAL_MODELS: Model[] = [
  {
    id: "grok-3-beta",
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Grok 3 Beta",
    prompt: "You are Grok Beta, an advanced AI assistant created by xAI.",
    option: "grok-3-beta",
    temperature: "1",
    pinned: false,
  },
  {
    id: "grok-2",
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Grok 2",
    prompt: "You are Grok 2, a powerful AI assistant created by xAI.",
    option: "grok-2",
    temperature: "1",
    pinned: false,
  },
  {
    id: "grok-3-mini-fast-beta",
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Grok 3 Fast Mini",
    prompt: "You are Grok, a helpful AI assistant created by xAI.",
    option: "grok-3-mini-fast-beta",
    temperature: "1",
    pinned: false,
  },
];

const CACHE_KEY = "models-cache";
const CACHE_TTL_KEY = "models-cache-ttl";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function useModel(): ModelHook {
  const [data, setData] = useState<Record<string, Model>>({});
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [option, setOption] = useState<Model["option"][]>([]);
  const isInitialMount = useRef(true);
  const { apiKey } = useGrokAPI();

  // Helper function to convert API models to local Model format
  const convertAPIModelToLocal = (apiModel: { id: string; owned_by?: string }): Model => {
    // Map common model names to friendly names
    const modelNameMap: Record<string, string> = {
      "grok-3-mini-fast-beta": "Grok 3 Fast Mini",
      "grok-3-mini-beta": "Grok 3 Mini Beta",
      "grok-3-beta": "Grok 3 Beta",
      "grok-2": "Grok 2",
      "grok-4": "Grok 4",
    };

    return {
      id: apiModel.id,
      name: modelNameMap[apiModel.id] || apiModel.id,
      option: apiModel.id,
      prompt: `You are ${modelNameMap[apiModel.id] || apiModel.id}, an AI assistant created by xAI.`,
      temperature: "1",
      pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  // Helper function to get default models
  const getDefaultModels = (): Record<string, Model> => {
    return {
      [DEFAULT_MODEL.id]: DEFAULT_MODEL,
      ...ADDITIONAL_MODELS.reduce((acc, model) => ({ ...acc, [model.id]: model }), {}),
    };
  };

  useEffect(() => {
    (async () => {
      debugLog("Loading models");
      setIsFetching(true);

      try {
        // Check cache first
        const cachedModels = await LocalStorage.getItem<string>(CACHE_KEY);
        const cacheTTL = await LocalStorage.getItem<string>(CACHE_TTL_KEY);
        const now = Date.now();

        let apiModels: Record<string, Model> = {};
        let needsFetch = true;

        if (cachedModels && cacheTTL && now < parseInt(cacheTTL)) {
          debugLog("Using cached API models");
          try {
            apiModels = JSON.parse(cachedModels);
            needsFetch = false;
          } catch (error) {
            debugLog("Failed to parse cached models, will fetch fresh", error);
            needsFetch = true;
          }
        }

        if (needsFetch && apiKey) {
          debugLog("Fetching models from API");
          try {
            const fetchedModels = await fetchModels(apiKey);
            apiModels = fetchedModels.reduce(
              (acc, model) => {
                const localModel = convertAPIModelToLocal(model);
                return { ...acc, [localModel.id]: localModel };
              },
              {} as Record<string, Model>,
            );

            // Cache the fetched models
            await LocalStorage.setItem(CACHE_KEY, JSON.stringify(apiModels));
            await LocalStorage.setItem(CACHE_TTL_KEY, String(now + CACHE_DURATION));
            debugLog("Models cached", { count: Object.keys(apiModels).length });
          } catch (error) {
            debugLog("Failed to fetch models from API, using defaults", error);
            apiModels = getDefaultModels();
          }
        } else if (!apiKey) {
          debugLog("No API key available, using defaults");
          apiModels = getDefaultModels();
        }

        // Load user's custom models
        let storedModels: Model[] | Record<string, Model> = {};
        try {
          storedModels = JSON.parse((await LocalStorage.getItem<string>("models")) || "{}");
        } catch (error) {
          debugLog("Failed to parse stored models, using empty object", error);
          storedModels = {};
        }

        let customModels: Record<string, Model> = {};
        if (Array.isArray(storedModels)) {
          customModels = storedModels.reduce((acc, model) => ({ ...acc, [model.id]: model }), {});
        } else if (typeof storedModels === "object" && storedModels !== null) {
          customModels = storedModels;
        }

        // Merge API models with custom models (custom models take precedence)
        const allModels = { ...apiModels, ...customModels };

        debugLog("Setting model data", {
          apiModelCount: Object.keys(apiModels).length,
          customModelCount: Object.keys(customModels).length,
          totalModelCount: Object.keys(allModels).length,
        });

        setData(allModels);
        setOption([...new Set(Object.values(allModels).map((m) => m.option))]);
      } catch (error) {
        debugLog("Error loading models", error);
        // Fallback to defaults on any error
        const defaultModels = getDefaultModels();
        setData(defaultModels);
        setOption(Object.values(defaultModels).map((m) => m.option));
      } finally {
        setLoading(false);
        setIsFetching(false);
        isInitialMount.current = false;
      }
    })();
  }, [apiKey]);

  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    debugLog("Saving models to storage", { modelCount: Object.keys(data).length });
    LocalStorage.setItem("models", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (model: Model) => {
      debugLog("Adding model", { modelId: model.id, modelName: model.name });
      await showToast({
        title: "Saving your Grok model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newData = { ...prevData, [model.id]: { ...model, created_at: new Date().toISOString() } };
        setOption((prev) => [...new Set([...prev, model.option])]);
        return newData;
      });
      await showToast({
        title: "Grok model saved!",
        style: Toast.Style.Success,
      });
    },
    [setData],
  );

  const update = useCallback(
    async (model: Model) => {
      debugLog("Updating model", { modelId: model.id, modelName: model.name });
      await showToast({
        title: "Updating your Grok model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({
        ...prevData,
        [model.id]: {
          ...prevData[model.id],
          ...model,
          updated_at: new Date().toISOString(),
        },
      }));
      await showToast({
        title: "Grok model updated!",
        style: Toast.Style.Success,
      });
    },
    [setData],
  );

  const remove = useCallback(
    async (model: Model) => {
      debugLog("Removing model", { modelId: model.id, modelName: model.name });
      await showToast({
        title: "Removing your Grok model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newData = { ...prevData };
        delete newData[model.id];
        setOption((prev) => prev.filter((opt) => opt !== model.option));
        return newData;
      });
      await showToast({
        title: "Grok model removed!",
        style: Toast.Style.Success,
      });
    },
    [setData],
  );

  const clear = useCallback(async () => {
    debugLog("Clearing models");
    await showToast({
      title: "Clearing your Grok models...",
      style: Toast.Style.Animated,
    });
    const defaultModels = getDefaultModels();
    setData(defaultModels);
    setOption(Object.values(defaultModels).map((m) => m.option));
    await showToast({
      title: "Grok models cleared!",
      style: Toast.Style.Success,
    });
  }, [setData]);

  const setModels = useCallback(
    async (models: Record<string, Model>) => {
      debugLog("Setting models", { modelCount: Object.keys(models).length });
      setData(models);
      setOption([...new Set(Object.values(models).map((m) => m.option))]);
    },
    [setData],
  );

  return useMemo(
    () => ({ data, isLoading, option, add, update, remove, clear, setModels, isFetching }),
    [data, isLoading, option, add, update, remove, clear, setModels, isFetching],
  );
}
