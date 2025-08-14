import {
  getPreferenceValues,
  showToast,
  Toast,
  Clipboard,
  Form,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { processText } from "./lib/ai";
import { getTextFromSelectionOrClipboard } from "./lib/utils";

interface Preferences {
  openaiApiKey: string;
  openrouterApiKey: string;
  useOpenRouter: boolean;
  defaultModel: string;
  temperature: string;
  maxTokens: string;
  customSystemPrompt: string;
}

export default function CustomCommand() {
  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps } = useForm<{ prompt: string }>({
    onSubmit: async (values) => {
      if (!values.prompt.trim()) {
        showToast(Toast.Style.Failure, "Please enter a custom prompt");
        return;
      }

      try {
        // Get text from selection or clipboard
        const textToProcess = await getTextFromSelectionOrClipboard();

        if (!textToProcess) {
          return;
        }

        if (!preferences.openaiApiKey && !preferences.openrouterApiKey) {
          showToast(
            Toast.Style.Failure,
            "Please configure API keys in settings",
          );
          return;
        }

        showToast(Toast.Style.Animated, "Processing with custom prompt...");

        const response = await processText({
          text: textToProcess,
          action: "generalQuestion",
          model: preferences.defaultModel,
          temperature: parseFloat(preferences.temperature),
          maxTokens: parseInt(preferences.maxTokens),

          openaiApiKey: preferences.openaiApiKey,
          openrouterApiKey: preferences.openrouterApiKey,
          customSystemPrompt:
            preferences.customSystemPrompt ||
            "You are a helpful AI assistant. Follow the user's instructions precisely and output only the transformed text without explanations.",
          customPrompt: values.prompt,
        });

        if (response) {
          await Clipboard.paste(response);
          showToast(
            Toast.Style.Success,
            "Text processed and copied to clipboard",
          );
        } else {
          showToast(Toast.Style.Failure, "Failed to process text");
        }
      } catch (error) {
        showToast(
          Toast.Style.Failure,
          "Error processing text",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process Text" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.prompt}
        title="Custom Prompt"
        placeholder="Enter your custom prompt (e.g., 'Make this more professional', 'Add humor', 'Convert to bullet points')"
        info="Describe how you want the selected text to be transformed"
      />
    </Form>
  );
}
