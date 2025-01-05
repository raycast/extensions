import { Alert, confirmAlert, Icon, LocalStorage, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Prompt, SuccessCallback, UseLocalPromptsReturn, UsePromptReturn } from "../types";

const PROMPTS_KEY = "prompts";

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
        const orderedPrompts = parsedPrompts.sort((a: Prompt, b: Prompt) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return 0;
        });
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

  return [create, destroy];
}
