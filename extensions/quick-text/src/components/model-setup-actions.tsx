import { Action, Icon, open } from "@raycast/api";
import { ModelErrorState } from "@/components";
import type { RecommendedModel } from "@/utils";

interface ModelSetupActionsProps {
  modelErrorState: ModelErrorState | null;
  onRunSetupFlow: (model: RecommendedModel) => Promise<void>;
  onRefreshModels: () => void;
}

export function ModelSetupActions({
  modelErrorState,
  onRunSetupFlow,
  onRefreshModels,
}: ModelSetupActionsProps) {
  return (
    <>
      {modelErrorState === ModelErrorState.OllamaNotRunning && (
        <Action
          title="Open Ollama"
          icon={Icon.AppWindow}
          onAction={() => void open("ollama://")}
        />
      )}
      <Action
        title={
          modelErrorState === ModelErrorState.OllamaMissing ||
          modelErrorState === ModelErrorState.OllamaNotRunning
            ? "Install Ollama + Pull Granite4:350m"
            : "Pull Granite4:350m (~700Mb)"
        }
        icon={Icon.Download}
        onAction={() => void onRunSetupFlow("granite4:350m")}
      />
      {modelErrorState === ModelErrorState.OllamaNoModels && (
        <Action
          title="Pull Granite4 (~2Gb)"
          icon={Icon.Download}
          onAction={() => void onRunSetupFlow("granite4")}
        />
      )}
      <Action
        title="Refresh Models"
        icon={Icon.ArrowClockwise}
        onAction={onRefreshModels}
      />
    </>
  );
}
