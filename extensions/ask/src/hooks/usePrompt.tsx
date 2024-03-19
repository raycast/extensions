import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ConfigurationPreferences, Prompt, PromptHook, PromptPrimitive, PromptType } from "../type";

const preferences = getPreferenceValues<ConfigurationPreferences>();

export function promptFromPrimitive({ name, system_prompt, temperature }: PromptPrimitive): Prompt {
  return {
    name,
    system_prompt,
    id: uuidv4(),
    temperature: String(temperature),
    last_used_100ms_epoch: new Date().valueOf() / 100,
    option: preferences.defaultModel,
    type: PromptType.SelectedTextInstantAction,
  };
}

export function defaultPrompts(): Prompt[] {
  return [
    promptFromPrimitive({
      name: "Make shorter",
      system_prompt:
        "Make the following text shorter with the following instructions: Use the same style and tone of voice, reduce repetition, keep key information.",
      temperature: "0",
    }),
    promptFromPrimitive({
      name: "Fix spelling and grammar",
      system_prompt: "Fix spelling, grammar and punctuation. ONLY write the corrected version without explanations.",
      temperature: "0",
    }),
    promptFromPrimitive({
      name: "Change tone to friendly",
      system_prompt:
        "Rewrite the text using an everyday, friendly tone, correct spelling and grammar, keep meaning unchanged.",
      temperature: "0",
    }),
    promptFromPrimitive({
      name: "Change tone to professional",
      system_prompt:
        "Rewrite the text using a professional tone of voice, formal language, concise phrasing, meaning unchanged.",
      temperature: "0",
    }),
    promptFromPrimitive({
      name: "Improve writing",
      system_prompt:
        "Act as a world class content writer. Improve the text with the following instructions: Improve clarity, Break up overly long sentences, Reduce repetition, Keep the meaning and tone of voice same, Do NOT write any explanations.",
      temperature: "0",
    }),
    promptFromPrimitive({
      name: "Summarize",
      system_prompt: "Summarize all relevant aspects from the following text as concise as possible.",
      temperature: "0",
    }),
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
    async (newPrompt: Prompt) => {
      const toast = await showToast({
        title: "Saving your prompt...",
        style: Toast.Style.Animated,
      });
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
      const toast = await toastPromise;
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
    setData(defaultPrompts());
    toast.title = "Prompts cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, option: [preferences.defaultModel], add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear]
  );
}
