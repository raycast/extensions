import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Model } from "../types/model";
import { useQuestions } from "./useQuestions";

export function useModels() {
  const [data, setData] = useState<Model[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const { updateQuestionsByModelId } = useQuestions();

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>("models");
      if (stored) {
        // Default models stored without questions
        const items: Model[] = JSON.parse(stored);

        setData(items);
      }
      setLoading(false);
    })();
  }, []);

  const saveToLocalStorage = async (models: Model[]) => {
    try {
      await LocalStorage.setItem("models", JSON.stringify(models));
    } catch (error) {
      showToast({
        title: "Failed to save model",
        style: Toast.Style.Failure,
      });
      throw error;
    }
  };

  const add = useCallback(
    async (model: Model) => {
      setLoading(true);
      const toast = await showToast({
        title: "Creating model...",
        style: Toast.Style.Animated,
      });
      const newData = [model, ...data];
      await saveToLocalStorage(newData);
      setData(newData);

      toast.title = "Model created!";
      toast.style = Toast.Style.Success;
      setLoading(false);
    },
    [data],
  );

  const update = useCallback(
    async (model: Model) => {
      setLoading(true);
      const toast = await showToast({
        title: "Updating model...",
        style: Toast.Style.Animated,
      });

      const newData = data.map((m) => (m.id === model.id ? model : m));
      await saveToLocalStorage(newData);
      setData(newData);

      toast.title = "Model updated!";
      toast.style = Toast.Style.Success;
      setLoading(false);
    },
    [data],
  );

  const remove = useCallback(
    async (model: Model) => {
      setLoading(true);
      const toast = await showToast({
        title: "Removing model...",
        style: Toast.Style.Animated,
      });

      try {
        // Update all questions with this model
        await updateQuestionsByModelId(model.id);

        // Remove model
        const newData = data.filter((m) => m.id !== model.id);
        await saveToLocalStorage(newData);
        setData(newData);

        toast.title = "Model removed!";
        toast.style = Toast.Style.Success;
      } catch (error) {
        console.error("Error removing model:", error);
        toast.title = "Failed to remove model";
        toast.style = Toast.Style.Failure;
      } finally {
        setLoading(false);
      }
    },
    [data],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await LocalStorage.getItem<string>("models");

      if (stored) {
        // Default models stored without questions
        const items: Model[] = JSON.parse(stored);

        setData(items);
      } else {
        console.error("Error refreshing models: No models found.");
      }
    } catch (error) {
      console.error("Error refreshing models:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, refresh }),
    [data, isLoading, add, update, remove, refresh],
  );
}
