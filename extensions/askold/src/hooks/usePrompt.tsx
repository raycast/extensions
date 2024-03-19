import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ConfigurationPreferences, Prompt, PromptHook } from "../type";

const preferences = getPreferenceValues<ConfigurationPreferences>();

export function defaultPrompts(): Prompt[] {
  return [
    {
      id: uuidv4(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      name: "Ask " + preferences.defaultModel,
      prompt: "You are a helpful assistant.",
      option: preferences.defaultModel,
      apiEndpoint: preferences.apiEndpoint,
      apiEndpointName: "Main API",
      temperature: "1",
    },
  ];
}

export function usePrompt(): PromptHook {
  const [data, setData] = useState<Prompt[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedPrompts = await LocalStorage.getItem<string>("prompts");

      if (!storedPrompts) {
        setData(defaultPrompts());
      } else {
        setData((previous) => [...previous, ...JSON.parse(storedPrompts)]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("prompts", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (prompt: Prompt) => {
      const toast = await showToast({
        title: "Saving your prompt...",
        style: Toast.Style.Animated,
      });
      const newPrompt: Prompt = { ...prompt, created_at: new Date().toISOString() };
      setData([...data, newPrompt]);
      toast.title = "Prompt saved!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const update = useCallback(
    async (prompt: Prompt) => {
      let toastPromise;
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === prompt.id) {
            toastPromise = showToast({
              title: "Updating your prompt...",
              style: Toast.Style.Animated,
            });
            return prompt;
          }
          return x;
        });
      });
      let toast = await toastPromise;
      if (toast !== undefined) {
        (toast as Toast).title = "Prompt updated!";
        (toast as Toast).style = Toast.Style.Success;
      }
    },
    [setData, data]
  );

  const remove = useCallback(
    async (prompt: Prompt) => {
      const toast = await showToast({
        title: "Remove your prompt...",
        style: Toast.Style.Animated,
      });
      const newPrompts: Prompt[] = data.filter((oldPrompt) => oldPrompt.id !== prompt.id);
      setData(newPrompts);
      toast.title = "Prompt removed!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your prompts ...",
      style: Toast.Style.Animated,
    });
    setData([]);
    toast.title = "Prompts cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, option: [preferences.defaultModel], add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear]
  );
}
