import { showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { useClipboard, useProvider, useHistory, usePreferences, PromptPreview, PromptActions } from "../ui";
import { PresetManager, BUILT_IN_PRESETS } from "../core/presets";
import { ClipboardError, ProviderError, NetworkError } from "../core/types";
import { usePresetSelection } from "../ui/hooks/usePresetSelection";
import { PresetSelector } from "../ui/components/PresetSelector";

export default function EnhancePromptImages() {
  const [output, setOutput] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { clipboardText, isLoading: clipboardLoading, error: clipboardError } = useClipboard();
  const { provider, isProviderReady, providerError } = useProvider();
  const { saveToHistory, exportAsJson, isSaving } = useHistory();
  const { saveToHistory: shouldSaveToHistory } = usePreferences();
  const { push } = useNavigation();

  // Preset selection with default to images
  const { selectedPreset, allPresets, loading: presetsLoading, setSelectedPreset } = usePresetSelection("images");

  const preset = selectedPreset || BUILT_IN_PRESETS.images;
  const isLoading = clipboardLoading || !isProviderReady || isEnhancing || presetsLoading;

  useEffect(() => {
    if (!clipboardText || !provider || !isProviderReady || clipboardError || providerError || !selectedPreset) {
      return;
    }

    enhancePrompt();
  }, [clipboardText, provider, isProviderReady, clipboardError, providerError, selectedPreset]);

  const enhancePrompt = async () => {
    if (!provider || !clipboardText) return;

    try {
      setIsEnhancing(true);
      setError(null);

      // Validate input
      const validation = PresetManager.validatePrompt(clipboardText);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Render the preset template with input
      const renderedPrompt = PresetManager.renderPreset(preset, {
        input: clipboardText,
        style: "photorealistic",
        quality: "high resolution",
        aspect: "16:9",
      });

      // Enhance the prompt using rendered template
      const startTime = Date.now();
      const enhancedPrompt = await provider.enhance(clipboardText, {
        ...preset,
        systemPrompt: renderedPrompt,
      });
      const processingTime = Date.now() - startTime;

      setOutput(enhancedPrompt);

      // Save to history if enabled
      if (shouldSaveToHistory) {
        await saveToHistory(clipboardText, enhancedPrompt, preset.id, {
          provider: provider.name,
          processingTime,
        });
      }
    } catch (err) {
      let errorMessage = "An unexpected error occurred";

      if (err instanceof ClipboardError) {
        errorMessage = err.message;
      } else if (err instanceof ProviderError) {
        errorMessage = `${err.message}\n\nTips:\n- Make sure Ollama is running: \`ollama serve\`\n- Check your model is available: \`ollama list\``;
      } else if (err instanceof NetworkError) {
        errorMessage = `${err.message}\n\nPlease check your network connection and Ollama configuration.`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Image Enhancement Failed",
        message: errorMessage,
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!output || !clipboardText) return;

    await saveToHistory(clipboardText, output, preset.id, {
      provider: provider?.name || "unknown",
      processingTime: 0,
    });
  };

  const handleExportJson = () => {
    if (!output || !clipboardText) return "";

    const jsonData = exportAsJson(clipboardText, output, preset.id);
    return jsonData;
  };

  const handleChangePreset = () => {
    push(
      <PresetSelector
        presets={allPresets}
        selectedPreset={selectedPreset}
        onSelectPreset={setSelectedPreset}
        title="Choose Image Enhancement Preset"
      />,
    );
  };

  // Determine the final error to show
  const finalError = clipboardError || providerError || error;

  return (
    <PromptPreview
      input={clipboardText}
      output={output}
      isLoading={isLoading}
      error={finalError || undefined}
      presetName={preset.name}
      actions={
        output && !finalError ? (
          <PromptActions
            input={clipboardText}
            output={output}
            onSave={shouldSaveToHistory ? undefined : handleSave}
            onExportJson={handleExportJson}
            onChangePreset={handleChangePreset}
            currentPreset={preset}
            disabled={isSaving}
          />
        ) : finalError ? (
          <PromptActions
            input={clipboardText}
            output=""
            onChangePreset={handleChangePreset}
            currentPreset={preset}
            disabled={true}
          />
        ) : undefined
      }
    />
  );
}
