import { showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { Model, ModelHook } from "../type";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useProxy } from "./useProxy";
import { modelCatalog, saveConfiguration, useModelCatalog } from "./useModelCatalog";
import { DEFAULT_MODEL } from "../utils/model-defaults";
export { DEFAULT_MODEL } from "../utils/model-defaults";

const actions = {
  add: (model: Model) => saveConfiguration(() => modelCatalog.saveModel(model), "Model saved"),
  update: (model: Model) => saveConfiguration(() => modelCatalog.saveModel(model), "Model updated"),
  remove: (model: Model) => saveConfiguration(() => modelCatalog.removeModel(model), "Model removed"),
  clear: () => saveConfiguration(() => modelCatalog.setModels({ default: DEFAULT_MODEL }), "Models cleared"),
  setModels: modelCatalog.setModels,
  importModels: modelCatalog.importModels,
};

export function useModel(fetchOptions = false): ModelHook {
  const { models: data, isLoading } = useModelCatalog();
  const [isFetching, setFetching] = useState(fetchOptions);
  const gpt = useChatGPT();
  const proxy = useProxy();
  const { useAzure, isCustomModel } = getConfiguration();
  const [option, setOption] = useState<Model["option"][]>(["gpt-5-nano", "gpt-5.2-chat-latest"]);

  useEffect(() => {
    if (!fetchOptions || isCustomModel) {
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
          if (!Array.isArray(models) || models.length === 0) {
            try {
              const body = JSON.parse((res as unknown as { body: string }).body);
              models = body.data;
            } catch {
              // ignore try to parse it
            }
          }
          if (Array.isArray(models)) setOption(models.map((x) => x.id));
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
    } else {
      setFetching(false);
    }
  }, [gpt, fetchOptions]);

  return useMemo(() => ({ data, isLoading, option, isFetching, ...actions }), [data, isLoading, option, isFetching]);
}
