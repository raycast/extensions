import { List, showToast, Toast } from "@raycast/api";
import type { ModelResponse } from "ollama";
import { useEffect, useState } from "react";
import { useOllama } from "@/hooks";
import { formatSize } from "@/utils";

export enum ModelErrorState {
  OllamaNotRunning = "ollama_not_running",
  OllamaMissing = "ollama_missing",
  OllamaNoModels = "ollama_no_models",
  OllamaSetupFailed = "ollama_setup_failed",
}

export function ModelSelectorDropdown({
  onModelSelected,
  onModelError,
  refreshToken,
}: {
  onModelSelected: (model: ModelResponse) => void;
  onModelError: (state: ModelErrorState) => void;
  refreshToken: number;
}) {
  const ollama = useOllama();
  const [models, setModels] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    function applyModels(result: { models: ModelResponse[] }) {
      if (isCancelled) return;
      setModels(result.models);
      if (result.models.length === 0) {
        onModelError(ModelErrorState.OllamaNoModels);
      }
    }

    async function fetchModels() {
      setIsLoading(true);
      try {
        applyModels(await ollama.list());
      } catch (error) {
        // Can't reach Ollama — it's probably closed. Let the user open it.
        onModelError(ModelErrorState.OllamaNotRunning);
        showToast({
          style: Toast.Style.Failure,
          title: "Can't reach Ollama",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    fetchModels();

    return () => {
      isCancelled = true;
    };
  }, [ollama, onModelError, refreshToken]);

  return (
    <List.Dropdown
      tooltip="Change model"
      storeValue
      isLoading={isLoading}
      onChange={(value) => {
        const model = models.find((m) => m.name === value);
        if (model) onModelSelected(model);
      }}
      placeholder="Search Ollama models..."
    >
      {models.map((model) => (
        <List.Dropdown.Item
          key={model.name}
          title={`${model.name} (${formatSize(model.size)})`}
          value={model.name}
        />
      ))}
    </List.Dropdown>
  );
}
