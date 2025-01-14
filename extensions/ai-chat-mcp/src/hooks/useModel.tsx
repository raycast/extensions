import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Model, ModelHook } from "../type";
import { useAnthropic } from "./useAnthropic";

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState(false);
  const anthropic = useAnthropic();

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const models = await anthropic.models.list();

        // Convert Anthropic models to our app's model format
        const anthropicModels = models.data.map((model) => ({
          id: model.id,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          name: model.display_name || model.id,
          prompt: "You are a helpful assistant.",
          model_id: model.id,
          max_tokens: "8192", // @todo Do we need this?
          pinned: false,
          description: model.display_name + " (" + model.id + ")",
        }));

        setData(anthropicModels);
      } catch (error) {
        console.error("Failed to fetch models:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [anthropic]);

  const add = useCallback(async (model: Model) => {
    const toast = await showToast({
      title: "Cannot add custom models",
      style: Toast.Style.Failure,
      message: "Only Anthropic API models are supported",
    });
  }, []);

  const update = useCallback(async (model: Model) => {
    LocalStorage.setItem("models", JSON.stringify([]));
    setData([]);
    const toast = await showToast({
      title: "Cannot update models",
      style: Toast.Style.Failure,
      message: "Models are read-only from the Anthropic API",
    });
  }, []);

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
      title: "Clear your models...",
      style: Toast.Style.Animated,
    });
    setData([]);
    LocalStorage.removeItem("models");
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear]
  );
}
