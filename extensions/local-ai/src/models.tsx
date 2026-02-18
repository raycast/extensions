import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  Toast,
  showToast,
  LocalStorage,
  launchCommand,
  LaunchType,
  Clipboard,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getProviderConfig, fetchModels } from "./lib/api";
import type { Model, ProviderConfig } from "./lib/types";
import { useOnboarding } from "./lib/use-onboarding";
import { OnboardingForm } from "./onboarding-form";

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  llamacpp: "llama.cpp",
  custom: "Custom",
};

function formatDiskSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function ModelsView() {
  const { push } = useNavigation();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [defaultModelId, setDefaultModelId] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string>("");

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setConnectionError("");

    const providerConfig = await getProviderConfig();
    setConfig(providerConfig);

    try {
      const modelList = await fetchModels(providerConfig);
      setModels(modelList);

      const storedDefault = await LocalStorage.getItem<string>("default_model");
      setDefaultModelId(
        storedDefault || providerConfig.defaultModel || modelList[0]?.id || "",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setConnectionError(msg);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleSetDefault = useCallback(async (modelId: string) => {
    await LocalStorage.setItem("default_model", modelId);
    setDefaultModelId(modelId);
    await showToast({
      style: Toast.Style.Success,
      title: "Default Model Set",
      message: modelId,
    });
  }, []);

  const handleStartChat = useCallback(async (modelId: string) => {
    try {
      await launchCommand({
        name: "chat",
        type: LaunchType.UserInitiated,
        context: { model: modelId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Launch Chat",
        message: msg,
      });
    }
  }, []);

  const handleCopyModelName = useCallback(async (modelId: string) => {
    await Clipboard.copy(modelId);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: modelId,
    });
  }, []);

  const providerLabel = config
    ? PROVIDER_LABELS[config.type] || config.type
    : "";

  if (!isLoading && connectionError) {
    const setupInstructions =
      `${config?.baseUrl || "Unknown URL"}\n\n` +
      `${connectionError}\n\n` +
      `How to start your server:\n` +
      `\u2022 Ollama: ollama serve (port 11434)\n` +
      `\u2022 LM Studio: Start server in app (port 1234)\n` +
      `\u2022 llama.cpp: llama-server -m model.gguf (port 8080)`;

    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              onAction={() => openExtensionPreferences()}
            />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={loadModels}
            />
            <Action
              title="Configure Extension"
              icon={Icon.Cog}
              onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Warning}
          title={`Cannot connect to ${providerLabel || "provider"}`}
          description={setupInstructions}
        />
      </List>
    );
  }

  if (!isLoading && models.length === 0 && !connectionError) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Refresh Models"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={loadModels}
            />
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              onAction={() => openExtensionPreferences()}
            />
            <Action
              title="Configure Extension"
              icon={Icon.Cog}
              onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Models Found"
          description={`No models available from ${providerLabel}.\n\nFor Ollama, run: ollama pull llama3.2\nFor LM Studio, download a model in the app.\nFor llama.cpp, specify a model file with -m flag.`}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter models...">
      {models.map((model) => {
        // Build subtitle from available metadata
        const subtitleParts: string[] = [];
        if (model.parameterSize) subtitleParts.push(model.parameterSize);
        if (model.quantizationLevel)
          subtitleParts.push(model.quantizationLevel);
        if (model.family) subtitleParts.push(model.family);
        const subtitle =
          subtitleParts.length > 0
            ? subtitleParts.join("  ·  ")
            : providerLabel;

        // Build accessories
        const accessories: List.Item.Accessory[] = [];
        if (model.supportsVision) {
          accessories.push({
            icon: { source: Icon.Eye, tintColor: Color.Green },
            tooltip: "Vision model",
          });
        }
        if (model.diskSize) {
          accessories.push({
            tag: formatDiskSize(model.diskSize),
            tooltip: "Disk size",
          });
        }
        if (model.maxContextLength) {
          accessories.push({
            tag: `${Math.round(model.maxContextLength / 1024)}K ctx`,
            tooltip: "Max context length",
          });
        }
        if (model.format) {
          accessories.push({
            tag: model.format.toUpperCase(),
            tooltip: "Format",
          });
        }
        accessories.push({
          tag: { value: providerLabel, color: Color.Blue },
          tooltip: "Provider",
        });
        if (model.id === defaultModelId) {
          accessories.push({
            icon: { source: Icon.Checkmark, tintColor: Color.Green },
            tooltip: "Default model",
          });
        }

        return (
          <List.Item
            key={model.id}
            title={model.id}
            subtitle={subtitle}
            icon={Icon.ComputerChip}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Default"
                  icon={Icon.Star}
                  onAction={() => handleSetDefault(model.id)}
                />
                <Action
                  title="Start Chat"
                  icon={Icon.Message}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => handleStartChat(model.id)}
                />
                <Action
                  title="Copy Model Name"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => handleCopyModelName(model.id)}
                />
                <Action
                  title="Refresh Models"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadModels}
                />
                <Action
                  title="Configure Extension"
                  icon={Icon.Cog}
                  onAction={() =>
                    push(<OnboardingForm onComplete={() => {}} />)
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Models() {
  const { needsOnboarding, isChecking, markDone } = useOnboarding();

  if (isChecking) {
    return <Detail isLoading markdown="" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm onComplete={markDone} />;
  }

  return <ModelsView />;
}
