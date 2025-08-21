import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  getSelectedText,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import getResponse from "./fuelix";
import { useCommandHistory } from "./useCommandHistory";

export default function useFuelIX(props, options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState(null);
  const [regenerateCounter, setRegenerateCounter] = useState(0);
  const { addToHistory } = useCommandHistory();
  const { defaultModel, apiKey, apiBaseURL } = getPreferenceValues();

  const { context = "", allowPaste = false, useSelected = false, buffer = null } = options;

  useEffect(() => {
    async function generateResponse() {
      setIsLoading(true);
      setError(null);

      try {
        let prompt = "";

        // Handle different input sources
        if (buffer && buffer.length > 0) {
          // Handle image/file buffer (for screenshots)
          prompt = context || "Analyze this image";
        } else if (useSelected) {
          try {
            const selectedText = await getSelectedText();
            prompt = context ? `${context}\n\n${selectedText}` : selectedText;
          } catch {
            prompt = context || "No text selected";
          }
        } else {
          prompt = context;
        }

        if (!prompt.trim()) {
          throw new Error("No prompt provided");
        }

        const result = await getResponse({
          prompt,
          modelName: defaultModel,
          apiKey,
          apiBaseURL,
          files: buffer && buffer.length > 0 ? buffer : undefined,
        });
        setResponse(result);

        // Add to history
        await addToHistory(prompt, result, defaultModel);

        await showToast({
          style: Toast.Style.Success,
          title: "Response generated successfully",
        });
      } catch (err) {
        console.error("Error generating response:", err);
        setError(err.message || "Failed to generate response");
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err.message || "Failed to generate response",
        });
      } finally {
        setIsLoading(false);
      }
    }

    generateResponse();
  }, [context, useSelected, buffer, defaultModel, apiKey, apiBaseURL, regenerateCounter]);

  const actions = (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Response" content={response} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      {allowPaste && (
        <Action
          title="Paste to Active App"
          onAction={async () => {
            await Clipboard.paste(response);
            await showToast({
              style: Toast.Style.Success,
              title: "Pasted to active app",
            });
          }}
          shortcut={{ modifiers: ["cmd"], key: "v" }}
        />
      )}
      <Action
        title="Regenerate"
        onAction={() => {
          // Trigger regeneration by incrementing counter to avoid infinite loops
          setRegenerateCounter((prev) => prev + 1);
          setError(null);
        }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} actions={actions} />;
  }

  return <Detail isLoading={isLoading} markdown={response || "Generating response..."} actions={actions} />;
}
