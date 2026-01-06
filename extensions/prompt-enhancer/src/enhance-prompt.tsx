import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { enhancePrompt } from "./api";
import CompareView from "./compare-view";
import { DEFAULT_FAVORITE_MODELS, FavoriteModel } from "./favorite-models";
import { ProviderType } from "./providers";

interface Preferences {
  autoUseClipboard: boolean;
}

export default function EnhancePromptCommand() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  useEffect(() => {
    async function loadClipboard() {
      if (preferences.autoUseClipboard) {
        try {
          const clipboardText = await Clipboard.readText();
          if (clipboardText && clipboardText.trim()) {
            setPrompt(clipboardText.trim());
          }
        } catch {
          // Silently ignore clipboard read errors
        }
      }
    }
    loadClipboard();
  }, []);

  async function handleSubmit(favoriteModel?: FavoriteModel) {
    if (!prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty prompt",
        message: "Please enter a prompt to enhance",
      });
      return;
    }

    setIsLoading(true);

    try {
      const modelName = favoriteModel ? favoriteModel.name : "default settings";
      await showToast({
        style: Toast.Style.Animated,
        title: `Enhancing with ${modelName}...`,
      });

      const options = favoriteModel
        ? {
            providerOverride: favoriteModel.provider as ProviderType,
            modelOverride: favoriteModel.model,
          }
        : undefined;

      const result = await enhancePrompt(prompt.trim(), options);

      // Navigate to compare view
      push(
        <CompareView
          originalPrompt={prompt.trim()}
          enhancedPrompt={result.enhancedPrompt}
          provider={result.provider}
          model={result.model}
          style={result.style}
        />,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "Enhancement failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUseClipboard() {
    try {
      const clipboardText = await Clipboard.readText();
      if (clipboardText && clipboardText.trim()) {
        setPrompt(clipboardText.trim());
        await showToast({
          style: Toast.Style.Success,
          title: "Clipboard loaded",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard is empty",
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read clipboard",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Enhance Prompt"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => handleSubmit()}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quick Switch Model">
            {DEFAULT_FAVORITE_MODELS.map((model) => (
              <Action
                key={model.id}
                title={`Use ${model.name}`}
                icon={Icon.ComputerChip}
                onAction={() => handleSubmit(model)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Use Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
              onAction={handleUseClipboard}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Your Prompt"
        placeholder="Enter your prompt here... (e.g., 'write code that makes website')"
        value={prompt}
        onChange={setPrompt}
        autoFocus
      />
      <Form.Description
        title="How it works"
        text="Enter a rough prompt, press ⌘+Return to enhance. Use the action menu to switch models on-the-fly."
      />
    </Form>
  );
}
