import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Model, ModelHook } from "../type";
import { fetchAvailableModels } from "../api/models";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Default Model",
  prompt: "You are a useful assistant",
  option: "claude-haiku-4-5-20251001",
  temperature: "1",
  max_tokens: "4096",
  pinned: false,
};

// Fallback models in case API fetch fails
const FALLBACK_OPTIONS: Model["option"][] = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-1-20250805",
];

async function getStoredModels(): Promise<Model[]> {
  const storedModels = await LocalStorage.getItem<string>("models");
  if (!storedModels) {
    return [DEFAULT_MODEL];
  }

  return JSON.parse(storedModels) satisfies Model[];
}

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [option, setOption] = useState<Model["option"][]>(FALLBACK_OPTIONS);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; display_name: string }>>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getStoredModels(), fetchAvailableModels()])
      .then(([models, availableModelsData]) => {
        // Extract model IDs from the fetched available models
        const modelOptions = availableModelsData.map((m) => m.id as Model["option"]);
        setOption(modelOptions);
        // Store full available models for display names
        setAvailableModels(availableModelsData);

        // Update default model to use first available model if needed
        const updatedModels = models.map((m) => {
          if (m.id === "default" && modelOptions.length > 0) {
            return { ...m, option: modelOptions[0] };
          }
          return m;
        });
        setData(updatedModels);
      })
      .catch((error) => {
        console.error("Error loading models:", error);
        // Still load stored models even if API fetch fails
        getStoredModels().then(setData);
        // Keep fallback options
      })
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Saving your model...",
        style: Toast.Style.Animated,
      });
      const newModel: Model = { ...model, created_at: new Date().toISOString() };
      setData((prevData) => {
        const newData = [...prevData, newModel];
        LocalStorage.setItem("models", JSON.stringify(newData));
        return newData;
      });
      toast.title = "Model saved!";
      toast.style = Toast.Style.Success;
    },
    [setData]
  );

  const update = useCallback(
    async (model: Model) => {
      setData((prevData) => {
        const newModels = prevData.map((x) => {
          if (x.id === model.id) {
            return model;
          }
          return x;
        });
        LocalStorage.setItem("models", JSON.stringify(newModels));
        return newModels;
      });
    },
    [setData]
  );

  const remove = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Removing your model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newModels = prevData.filter((oldModel) => oldModel.id !== model.id);
        LocalStorage.setItem("models", JSON.stringify(newModels));
        return newModels;
      });
      toast.title = "Model removed!";
      toast.style = Toast.Style.Success;
    },
    [setData]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your models...",
      style: Toast.Style.Animated,
    });
    setData((prevData) => {
      const newModels: Model[] = prevData.filter((oldModel) => oldModel.id === DEFAULT_MODEL.id);
      LocalStorage.setItem("models", JSON.stringify(newModels));
      return newModels;
    });
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, option, availableModels, add, update, remove, clear }),
    [data, isLoading, option, availableModels, add, update, remove, clear]
  );
}
