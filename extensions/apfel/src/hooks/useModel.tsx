import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Model, ModelHook } from "../type";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Default Model",
  prompt: "You are a useful assistant",
  pinned: false,
  temperature: "1.0",
  max_tokens: "4096",
};

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
  const [availableModels] = useState<Array<{ id: string; display_name: string }>>([]);

  useEffect(() => {
    setLoading(true);

    getStoredModels()
      .then((models) => {
        setData(models);
      })
      .catch((error) => {
        console.error("Error loading models:", error);
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
    [setData],
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
    [setData],
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
    [setData],
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
    () => ({ data, isLoading, availableModels, add, update, remove, clear }),
    [data, isLoading, availableModels, add, update, remove, clear],
  );
}
