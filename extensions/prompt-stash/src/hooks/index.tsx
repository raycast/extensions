import { Alert, confirmAlert, Icon, LocalStorage, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Prompt, SuccessCallback, UseLocalPromptsReturn, UsePromptReturn } from "../types";

const PROMPTS_KEY = "prompts";

const sortPrompts = (prompts: Prompt[]) => {
  return prompts.sort((a: Prompt, b: Prompt) => {
    if (a?.updatedAt && b?.updatedAt) {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (a.updatedAt) return -1;
    if (b.updatedAt) return 1;
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });
};

export function useLocalPrompts(): UseLocalPromptsReturn {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      const storedPrompts = await LocalStorage.getItem<string>(PROMPTS_KEY);
      if (storedPrompts) {
        const parsedPrompts = JSON.parse(storedPrompts);
        const orderedPrompts = sortPrompts(parsedPrompts);
        setPrompts(orderedPrompts);
      }
    } catch (error) {
      console.error("Error loading prompts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return [prompts, isLoading, loadPrompts];
}

export function usePrompt(): UsePromptReturn {
  const [prompts, , loadPrompts] = useLocalPrompts();

  async function create(newPrompt: Prompt, onSuccess?: SuccessCallback, onError?: ErrorCallback) {
    try {
      const newPrompts = [...prompts, newPrompt];
      await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(newPrompts));
      onSuccess?.();
      loadPrompts();
    } catch (error) {
      onError?.(error as DOMException);
    }
  }
  async function destroy(promptId: string, onSuccess?: SuccessCallback, onError?: ErrorCallback) {
    try {
      if (
        !(await confirmAlert({
          title: "Delete Prompt",
          message: "Are you sure you want to delete this prompt?",
          icon: Icon.Trash,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      ) {
        return;
      }

      const storedPrompts = await LocalStorage.getItem<string>(PROMPTS_KEY);
      const currentPrompts = storedPrompts ? JSON.parse(storedPrompts) : [];

      const filteredPrompts = currentPrompts.filter((p: Prompt) => p.id !== promptId);

      await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(filteredPrompts));
      await showToast({ title: "Deleted", message: "Prompt deleted successfully" });
      await loadPrompts();
      await onSuccess?.();
    } catch (error) {
      onError?.(error as DOMException);
      await showToast({ title: "Error", message: "Failed to delete prompt" });
    }
  }
  async function update(promptId: string, updatedPrompt: Prompt, onSuccess?: SuccessCallback, onError?: ErrorCallback) {
    try {
      const storedPrompts = await LocalStorage.getItem<string>(PROMPTS_KEY);
      const currentPrompts = storedPrompts ? JSON.parse(storedPrompts) : [];

      const updatedPrompts = currentPrompts.map((p: Prompt) =>
        p.id === promptId ? { ...updatedPrompt, updatedAt: new Date() } : p,
      );

      const sortedPrompts = sortPrompts(updatedPrompts);
      await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(sortedPrompts));
      onSuccess?.();
      loadPrompts();
    } catch (error) {
      onError?.(error as DOMException);
    }
  }

  return [create, destroy, update];
}
