import {
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { ModelErrorState, ModelSetupActions } from "@/components";
import {
  getOllamaInstallCommand,
  RecommendedModel,
  setupOllamaAndPullModel,
} from "@/utils";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

interface OllamaNoModelViewProps {
  ollamaErrorState: ModelErrorState | null;
  setOllamaErrorState: Dispatch<SetStateAction<ModelErrorState | null>>;
  refreshModels: () => void;
}

const ERROR_VIEWS: Record<
  ModelErrorState,
  { icon: Icon; title: string; subtitle: string; markdown: string }
> = {
  [ModelErrorState.OllamaNotRunning]: {
    icon: Icon.Plug,
    title: "Ollama is not running",
    subtitle: "Open Ollama, then refresh",
    markdown: [
      "### Can't reach Ollama",
      "",
      "The Ollama server didn't respond. It's probably closed.",
      "",
      "### What to do",
      "",
      "1. Run the **Open Ollama** action below.",
      "2. Wait a couple seconds for it to start.",
      "3. Run **Refresh Models**.",
      "",
      "> Not installed yet? Use **Install Ollama + Pull Granite4:350m** instead.",
    ].join("\n"),
  },
  [ModelErrorState.OllamaMissing]: {
    icon: Icon.ExclamationMark,
    title: "Ollama not available",
    subtitle: "Install Ollama and pull a starter model",
    markdown: [
      "### What this action will do",
      "",
      "1. Detect your OS automatically.",
      "2. Install Ollama with the official command for your OS.",
      "3. Pull recommended model `granite4:350m` (<1GB).",
      "4. Refresh model list.",
      "",
      "### Install command by OS",
      "",
      "```sh",
      "curl -fsSL https://ollama.com/install.sh | sh",
      "```",
      "```powershell",
      "irm https://ollama.com/install.ps1 | iex",
      "```",
      "",
      "### Model pull command",
      "",
      "```sh",
      "ollama pull granite4:350m",
      "```",
      "",
      "### Recommendation",
      "",
      "> Use simple models without integrated thinking to keep quick-text fast.",
    ].join("\n"),
  },
  [ModelErrorState.OllamaNoModels]: {
    icon: Icon.Stars,
    title: "No Ollama models found",
    subtitle: "Download granite4 or granite4:350m",
    markdown: [
      "### What this action will do",
      "",
      "1. Skip Ollama installation (already detected).",
      "2. Pull selected model.",
      "3. Refresh model list after download.",
      "",
      "### Model pull commands",
      "",
      "```sh",
      "ollama pull granite4:350m",
      "```",
      "```sh",
      "ollama pull granite4",
      "```",
      "",
      "### Recommendation",
      "",
      "> Prefer simple models without integrated thinking. Thinking-enabled models usually slow down quick processing.",
    ].join("\n"),
  },
  [ModelErrorState.OllamaSetupFailed]: {
    icon: Icon.ExclamationMark,
    title: "Setup failed",
    subtitle: "Try again or run manual install",
    markdown: [
      "### What happened",
      "",
      "Automatic setup failed while installing Ollama or pulling the model.",
      "",
      "### What this action will do",
      "",
      "Retry installation/pull with confirmation.",
      "",
      "### Manual fallback commands",
      "",
      "```sh",
      "curl -fsSL https://ollama.com/install.sh | sh",
      "```",
      "```powershell",
      "irm https://ollama.com/install.ps1 | iex",
      "```",
      "",
      "### Recommendation",
      "",
      "> Use simple models without integrated thinking for faster quick-text responses.",
    ].join("\n"),
  },
};

export function NoModelItem({
  ollamaErrorState,
  setOllamaErrorState,
  refreshModels,
}: OllamaNoModelViewProps) {
  const [isSetupRunning, setIsSetupRunning] = useState(false);

  const runSetupFlow = useCallback(
    async (model: RecommendedModel) => {
      try {
        getOllamaInstallCommand(process.platform);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setOllamaErrorState(ModelErrorState.OllamaSetupFailed);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unsupported OS",
          message,
        });
        return;
      }
      const userApproved = await confirmAlert({
        title: "Install Ollama and download model?",
        message: `This will run CLI commands to install Ollama (if needed) and pull ${model}.`,
        primaryAction: {
          title: "Continue",
          style: Alert.ActionStyle.Default,
        },
      });

      if (!userApproved) return;
      setIsSetupRunning(true);
      setOllamaErrorState(null);

      const setupToast = await showToast({
        style: Toast.Style.Animated,
        title: "Setting up Ollama",
        message: `Pulling ${model}...`,
      });

      try {
        await setupOllamaAndPullModel(model);
        setupToast.style = Toast.Style.Success;
        setupToast.title = "Ollama ready";
        setupToast.message = `${model} is now available.`;
        refreshModels();
      } catch (error) {
        setOllamaErrorState(ModelErrorState.OllamaSetupFailed);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setupToast.style = Toast.Style.Failure;
        setupToast.title = "Automatic setup failed";
        setupToast.message = message;
      } finally {
        setIsSetupRunning(false);
      }
    },
    [refreshModels, setOllamaErrorState],
  );

  if (isSetupRunning) {
    return (
      <List.EmptyView
        icon={Icon.Hourglass}
        title="Checking Ollama setup..."
        description="Please wait while we inspect available models."
      />
    );
  }

  const view = ollamaErrorState ? ERROR_VIEWS[ollamaErrorState] : null;
  if (view) {
    return (
      <List.Item
        icon={view.icon}
        title={view.title}
        subtitle={{ value: view.subtitle, tooltip: view.subtitle }}
        actions={
          <ActionPanel>
            <ModelSetupActions
              modelErrorState={ollamaErrorState}
              onRunSetupFlow={runSetupFlow}
              onRefreshModels={refreshModels}
            />
          </ActionPanel>
        }
        detail={<List.Item.Detail markdown={view.markdown} />}
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.Stars}
      title="No model selected"
      description="Select a model to continue. Prefer simple models without thinking for faster results."
    />
  );
}
