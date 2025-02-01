import { Action, ActionPanel, List, showHUD, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  downloadModel,
  getDownloadedModels,
  getAvailableModels,
  cleanupWhisper,
  isWhisperBinaryWorking,
  installWhisper,
} from "./utils/whisper-local";

interface ModelItem {
  id: string;
  name: string;
  description: string;
  isDownloaded: boolean;
}

const MODEL_DESCRIPTIONS = {
  tiny: "Fastest model, ~75MB. Good for quick transcriptions with decent accuracy.",
  base: "Balanced model, ~150MB. Good accuracy for most use cases.",
  small: "More accurate model, ~500MB. Better for complex audio.",
  medium: "Most accurate model, ~1.5GB. Best quality but slower.",
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isWhisperReady, setIsWhisperReady] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    setIsLoading(true);
    try {
      const whisperInstalled = await isWhisperBinaryWorking();
      setIsWhisperReady(whisperInstalled);

      const downloadedModels = getDownloadedModels();
      const availableModels = getAvailableModels();

      const modelItems: ModelItem[] = availableModels.map((modelId) => ({
        id: modelId,
        name: modelId.charAt(0).toUpperCase() + modelId.slice(1),
        description: MODEL_DESCRIPTIONS[modelId as keyof typeof MODEL_DESCRIPTIONS],
        isDownloaded: downloadedModels.includes(modelId),
      }));

      setModels(modelItems);
    } catch (error) {
      console.error("Error loading models:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInstallWhisper() {
    try {
      await installWhisper();
      await loadModels();
    } catch (error) {
      console.error("Error installing Whisper:", error);
      await showHUD("❌ Failed to install Whisper");
    }
  }

  async function handleDownloadModel(modelId: string) {
    try {
      await downloadModel(modelId);
      await loadModels();
    } catch (error) {
      console.error("Error downloading model:", error);
      await showHUD(`❌ Failed to download ${modelId} model`);
    }
  }

  async function handleCleanup() {
    try {
      await cleanupWhisper();
      await loadModels();
    } catch (error) {
      console.error("Error cleaning up Whisper:", error);
      await showHUD("❌ Failed to clean up Whisper files");
    }
  }

  if (!isWhisperReady) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Whisper Not Installed"
          description="Whisper needs to be installed locally to use offline speech recognition."
          actions={
            <ActionPanel>
              <Action title="Install Whisper" onAction={handleInstallWhisper} icon={Icon.Download} />
              <Action
                title="Clean up Whisper Files"
                onAction={handleCleanup}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["opt", "cmd"], key: "backspace" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Available Models">
        {models.map((model) => (
          <List.Item
            key={model.id}
            title={model.name}
            subtitle={model.description}
            accessories={[
              {
                text: model.isDownloaded ? "Downloaded" : "Not Downloaded",
                icon: model.isDownloaded ? Icon.Checkmark : Icon.Download,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {!model.isDownloaded && (
                    <Action
                      title={`Download ${model.name} Model`}
                      onAction={() => handleDownloadModel(model.id)}
                      icon={Icon.Download}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Clean up Whisper Files"
                    onAction={handleCleanup}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["opt", "cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
