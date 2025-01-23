import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Model, ModelHook } from "../type";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Haiku",
  prompt: "You are a helpful assistant.",
  option: "claude-3-5-haiku-latest",
  temperature: "1",
  max_tokens: "4096",
  pinned: false,
};

const option: Model["option"][] = [
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-2.1",
  "claude-2.0",
];

async function getStoredModels(): Promise<Model[]> {
  const storedModels = await LocalStorage.getItem<string>("models");
  if (!storedModels) {
    return [DEFAULT_MODEL];
  }
  return [...JSON.parse(storedModels), DEFAULT_MODEL] satisfies Model[];
}

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getStoredModels()
      .then(setData)
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
        title: "Remove your model...",
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
      title: "Clearing your models ...",
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
    () => ({ data, isLoading, option, add, update, remove, clear }),
    [data, isLoading, option, add, update, remove, clear]
  );
}
