import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Model, ModelHook } from "../type";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

export const DEFAULT_MODEL: Model = {
  id: "grok-3-mini-fast-beta",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Grok 3 Fast Mini",
  prompt: "You are Grok, a helpful AI assistant created by xAI.",
  option: "grok-3-mini-fast-beta",
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
    id: "grok-3-mini-beta",
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    name: "Grok 3 Mini Beta",
    prompt: "You are Grok 3, a powerful AI assistant created by xAI.",
    option: "grok-3-mini-beta",
    temperature: "1",
    pinned: false,
  },
];

export function useModel(): ModelHook {
  const [data, setData] = useState<Record<string, Model>>({});
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isFetching] = useState<boolean>(false);
  const [option, setOption] = useState<Model["option"][]>([
    "grok-3-fast-mini",
    "grok-3-beta",
    "grok-3-mini-beta",
    "grok-2",
  ]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    (async () => {
      debugLog("Loading models from storage");
      const storedModels: Model[] | Record<string, Model> = JSON.parse(
        (await LocalStorage.getItem<string>("models")) || "{}",
      );
      const storedModelsLength = ((models: Record<string, Model> | Model[]): number =>
        Array.isArray(models) ? models.length : Object.keys(models).length)(storedModels);

      let modelsById: Record<string, Model> = {};
      if (storedModelsLength === 0) {
        debugLog("No stored models, initializing defaults");
        modelsById = {
          [DEFAULT_MODEL.id]: DEFAULT_MODEL,
          ...ADDITIONAL_MODELS.reduce((acc, model) => ({ ...acc, [model.id]: model }), {}),
        };
      } else {
        debugLog("Processing stored models", { storedModelsLength });
        if (Array.isArray(storedModels)) {
          modelsById = storedModels.reduce((acc, model) => ({ ...acc, [model.id]: model }), {});
        } else {
          modelsById = storedModels;
        }
        // Ensure defaults are included
        if (!modelsById[DEFAULT_MODEL.id]) {
          modelsById[DEFAULT_MODEL.id] = DEFAULT_MODEL;
        }
        ADDITIONAL_MODELS.forEach((model) => {
          if (!modelsById[model.id]) {
            modelsById[model.id] = model;
          }
        });
      }

      debugLog("Setting model data", { modelIds: Object.keys(modelsById) });
      setData(modelsById);
      setLoading(false);
      isInitialMount.current = false;
    })();
  }, []);

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
    const defaultModels = {
      [DEFAULT_MODEL.id]: DEFAULT_MODEL,
      ...ADDITIONAL_MODELS.reduce((acc, model) => ({ ...acc, [model.id]: model }), {}),
    };
    setData(defaultModels);
    setOption(["grok-3-fast-mini", "grok-beta", "grok-2"]);
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
