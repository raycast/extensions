import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Model, ModelHook } from "../type";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "sonar-medium-online",
  prompt: "You are a helpful research assistant",
  option: "sonar-medium-online",
  temperature: "1",
  pinned: false,
};

export const DEFAULT_MODEL_2: Model = {
  id: "default_2",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "sonar-small-online",
  prompt: "You are a helpful research assistant",
  option: "sonar-small-online",
  temperature: "1",
  pinned: false,
};

export const DEFAULT_MODEL_3: Model = {
  id: "default_2",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "sonar-medium-chat",
  prompt: "You are a helpful research assistant",
  option: "sonar-medium-chat",
  temperature: "1",
  pinned: false,
};

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const isFetching = false;
  const [option] = useState<Model["option"][]>([
    "sonar-medium-online",
    "sonar-medium-chat",
    "sonar-small-online",
    "sonar-small-chat",
    "llama-3-8b-instruct",
    "llama-3-70b-instruct",
    "codellama-70b-instruct",
    "mistral-7b-instruct",
    "mixtral-8x7b-instruct",
    "mixtral-8x22b-instruct",
  ]);

  useEffect(() => {
    (async () => {
      const storedModels = await LocalStorage.getItem<string>("models");

      if (!storedModels) {
        setData([DEFAULT_MODEL]);
      } else {
        setData((previous) => [...previous, ...JSON.parse(storedModels)]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("models", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Saving your model...",
        style: Toast.Style.Animated,
      });
      const newModel: Model = { ...model, created_at: new Date().toISOString() };
      setData([...data, newModel]);
      toast.title = "Model saved!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const update = useCallback(
    async (model: Model) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === model.id) {
            return model;
          }
          return x;
        });
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Remove your model...",
        style: Toast.Style.Animated,
      });
      const newModels: Model[] = data.filter((oldModel) => oldModel.id !== model.id);
      setData(newModels);
      toast.title = "Model removed!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your models ...",
      style: Toast.Style.Animated,
    });
    const newModels: Model[] = data.filter((oldModel) => oldModel.id === DEFAULT_MODEL.id);
    setData(newModels);
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, option, add, update, remove, clear, isFetching }),
    [data, isLoading, option, add, update, remove, clear, isFetching]
  );
}
