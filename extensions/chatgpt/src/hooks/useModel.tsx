import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Model, ModelHook } from "../type";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useProxy } from "./useProxy";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Default",
  prompt: "You are a helpful assistant.",
  option: "gpt-3.5-turbo",
  temperature: "1",
  pinned: false,
  vision: false,
};

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isFetching, setFetching] = useState<boolean>(true);
  const gpt = useChatGPT();
  const proxy = useProxy();
  const { useAzure, isCustomModel } = getConfiguration();
  const [option, setOption] = useState<Model["option"][]>(["gpt-3.5-turbo", "gpt-3.5-turbo-0301"]);

  useEffect(() => {
    if (isCustomModel) {
      // If choose to use custom model, we don't need to fetch models from the API
      setFetching(false);
      return;
    }
    if (!useAzure) {
      gpt.models
        .list({ httpAgent: proxy })
        .then((res) => {
          let models = res.data;
          // some provider return text/plain content type
          // and the sdk `defaultParseResponse` simply return `text`
          if (models.length === 0) {
            try {
              const body = JSON.parse((res as unknown as { body: string }).body);
              models = body.data;
            } catch (e) {
              // ignore try to parse it
            }
          }
          setOption(models.filter((m) => m.id.startsWith("gpt")).map((x) => x.id));
        })
        .catch(async (err) => {
          console.error(err);
          if (!(err instanceof Error || err.message)) {
            return;
          }
          await showToast(
            err.message.includes("401")
              ? {
                  title: "Could not authenticate to API",
                  message: "Please ensure that your API token is valid",
                  style: Toast.Style.Failure,
                }
              : {
                  title: "Error",
                  message: err.message,
                  style: Toast.Style.Failure,
                }
          );
        })
        .finally(() => {
          setFetching(false);
        });
    } else {
      setFetching(false);
    }
  }, [gpt]);

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
