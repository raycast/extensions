import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { enhancePrompt } from "./api";

interface Preferences {
  autoUseClipboard: boolean;
}

export default function EnhancePromptCommand() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadClipboard() {
      if (preferences.autoUseClipboard) {
        try {
          const clipboardText = await Clipboard.readText();
          if (clipboardText && clipboardText.trim()) {
            setPrompt(clipboardText.trim());
          }
        } catch (error) {
          // Silently ignore clipboard read errors
        }
      }
    }
    loadClipboard();
  }, []);

  async function handleSubmit() {
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
      await showToast({
        style: Toast.Style.Animated,
        title: "Enhancing prompt...",
      });

      const enhancedPrompt = await enhancePrompt(prompt.trim());

      await Clipboard.copy(enhancedPrompt);

      await showToast({
        style: Toast.Style.Success,
        title: "Prompt enhanced!",
        message: "Copied to clipboard",
      });

      await popToRoot();
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
    } catch (error) {
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
          <Action
            title="Enhance Prompt"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleSubmit}
          />
          <Action
            title="Use Clipboard"
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={handleUseClipboard}
          />
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
        text="Enter a rough prompt, then press ⌘+Return to enhance it. The improved prompt will be automatically copied to your clipboard."
      />
    </Form>
  );
}
