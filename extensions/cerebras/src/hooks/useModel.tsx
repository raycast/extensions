import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Model, ModelHook } from "../type";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useProxy } from "./useProxy";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Default",
  prompt: "You are a helpful assistant.",
  option: "llama3.1-8b",
  temperature: "1",
  pinned: false,
  vision: false,
};

export function useModel(): ModelHook {
  const [data, setData] = useState<Record<string, Model>>({});
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isFetching, setFetching] = useState<boolean>(true);
  const gpt = useChatGPT();
  const proxy = useProxy();
  const { isCustomModel } = getConfiguration();
  const [option, setOption] = useState<Model["option"][]>(["llama3.1-8b"]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isCustomModel) {
      // If choose to use custom model, we don't need to fetch models from the API
      setFetching(false);
      return;
    }
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
        setOption(models.map((x) => x.id));
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
              },
        );
      })
      .finally(() => {
        setFetching(false);
      });
  }, [gpt]);

  useEffect(() => {
    (async () => {
      const storedModels: Model[] | Record<string, Model> = JSON.parse(
        (await LocalStorage.getItem<string>("models")) || "{}",
      );
      const storedModelsLength = ((models: Record<string, Model> | Model[]): number =>
        Array.isArray(models) ? models.length : Object.keys(models).length)(storedModels);

      if (storedModelsLength === 0) {
        setData({ [DEFAULT_MODEL.id]: DEFAULT_MODEL });
      } else {
        let modelsById: Record<string, Model>;
        // Support for old data structure
        if (Array.isArray(storedModels)) {
          modelsById = storedModels.reduce((acc, model) => ({ ...acc, [model.id]: model }), {});
        } else {
          modelsById = storedModels;
        }
        if (!modelsById[DEFAULT_MODEL.id]) {
          modelsById[DEFAULT_MODEL.id] = DEFAULT_MODEL;
        }
        setData(modelsById);
      }
      setLoading(false);
      isInitialMount.current = false;
    })();
  }, []);

  useEffect(() => {
    // Avoid saving when initial loading
    if (isInitialMount.current) {
      return;
    }
    LocalStorage.setItem("models", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Saving your model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({ ...prevData, [model.id]: { ...model, created_at: new Date().toISOString() } }));
      toast.title = "Model saved!";
      toast.style = Toast.Style.Success;
    },
    [setData],
  );

  const update = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Updating your model...",
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
      toast.title = "Model updated!";
      toast.style = Toast.Style.Success;
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
        const newData = { ...prevData };
        delete newData[model.id];
        return newData;
      });
      toast.title = "Model removed!";
      toast.style = Toast.Style.Success;
    },
    [setData],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your models ...",
      style: Toast.Style.Animated,
    });
    setData({ [DEFAULT_MODEL.id]: DEFAULT_MODEL });
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  const setModels = useCallback(
    async (models: Record<string, Model>) => {
      setData(models);
    },
    [setData],
  );

  return useMemo(
    () => ({ data, isLoading, option, add, update, remove, clear, setModels, isFetching }),
    [data, isLoading, option, add, update, remove, clear, setModels, isFetching],
  );
}
