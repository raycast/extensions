import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
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
      let promptsArray: Prompt[] = [];

      if (storedPrompts) {
        try {
          promptsArray = JSON.parse(storedPrompts);
        } catch (e) {
          console.error("Error parsing stored prompts:", e);
          promptsArray = [];
        }
      }

      // Ensure we have an array
      if (!Array.isArray(promptsArray)) {
        promptsArray = [];
      }

      const orderedPrompts = promptsArray.sort((a: Prompt, b: Prompt) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });

      setPrompts(orderedPrompts);

      // If no prompts exist, initialize with empty array
      if (!storedPrompts) {
        await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify([]));
      }
    } catch (error) {
      console.error("Error loading prompts:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load prompts",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return [prompts, isLoading, loadPrompts];
}

export function usePrompt(): UsePromptReturn {
  const [, , loadPrompts] = useLocalPrompts();

  async function create(newPrompt: Prompt, onSuccess?: SuccessCallback, onError?: ErrorCallback) {
    try {
      const storedPrompts = await LocalStorage.getItem<string>(PROMPTS_KEY);
      const currentPrompts: Prompt[] = storedPrompts ? JSON.parse(storedPrompts) : [];
      const newPrompts = [...currentPrompts, newPrompt];
      await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(newPrompts));
      onSuccess?.();
      loadPrompts();
    } catch (error) {
      console.error("Error creating prompt:", error);
      onError?.(error as DOMException);
    }
  }

  async function destroy(promptId: string, onSuccess?: SuccessCallback, onError?: ErrorCallback) {
    try {
      if (
        await confirmAlert({
          title: "Delete Prompt",
          message: "Are you sure you want to delete this prompt?",
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        const storedPrompts = await LocalStorage.getItem<string>(PROMPTS_KEY);
        const currentPrompts: Prompt[] = storedPrompts ? JSON.parse(storedPrompts) : [];
        const newPrompts = currentPrompts.filter((p) => p.id !== promptId);
        await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(newPrompts));
        await showToast({ title: "Deleted", message: "Prompt deleted successfully" });
        onSuccess?.();
        loadPrompts();
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
      onError?.(error as DOMException);
      await showToast({ title: "Error", message: "Failed to delete prompt" });
    }
  }

  async function update(updatedPrompt: Prompt, onSuccess?: SuccessCallback, onError?: ErrorCallback) {
    try {
      const storedPrompts = await LocalStorage.getItem<string>(PROMPTS_KEY);
      const currentPrompts: Prompt[] = storedPrompts ? JSON.parse(storedPrompts) : [];
      const newPrompts = currentPrompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
      await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(newPrompts));
      onSuccess?.();
      loadPrompts();
    } catch (error) {
      console.error("Error updating prompt:", error);
      onError?.(error as DOMException);
    }
  }

  return [create, destroy, update];
}
