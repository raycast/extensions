import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { normalizeModelName, DEFAULT_MODEL } from "./modelMigrations";

const ACTIVE_MODEL_KEY = "gemini_active_model";

function resolveInitialModel(): string {
  return normalizeModelName(DEFAULT_MODEL) ?? DEFAULT_MODEL;
}

export function useActiveModel() {
  const [activeModel, setActiveModelState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await LocalStorage.getItem<string>(ACTIVE_MODEL_KEY);
        if (stored) {
          setActiveModelState(normalizeModelName(stored) ?? stored);
        } else {
          setActiveModelState(resolveInitialModel());
        }
      } catch (error) {
        console.error("Failed to load active model:", error);
        setActiveModelState(resolveInitialModel());
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setActiveModel = async (model: string) => {
    const migrated = normalizeModelName(model) ?? model;
    await LocalStorage.setItem(ACTIVE_MODEL_KEY, migrated);
    setActiveModelState(migrated);
  };

  return { activeModel, setActiveModel, isLoading };
}
