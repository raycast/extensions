import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  Clipboard,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getProviderConfig, fetchModels, sendChatStream } from "./api";
import { parseSSEStream } from "./streaming";
import { getInputText } from "./text-input";
import type { ChatMessage, ProviderConfig } from "./types";
import { useOnboarding } from "./use-onboarding";
import { OnboardingForm } from "../onboarding-form";

interface TextTransformProps {
  title: string;
  systemPrompt: string;
}

function TransformView({ title, systemPrompt }: TextTransformProps) {
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    (async () => {
      let text: string;
      try {
        text = await getInputText();
      } catch {
        setIsLoading(false);
        setError(
          "No text found. Select text in any app or copy it to clipboard first.",
        );
        return;
      }
      setInputText(text);

      const config = await getProviderConfig();
      let selectedModel = config.defaultModel;

      try {
        const storedDefault =
          await LocalStorage.getItem<string>("default_model");
        if (storedDefault) {
          selectedModel = storedDefault;
        } else if (!selectedModel) {
          const modelList = await fetchModels(config);
          selectedModel = modelList[0]?.id || "";
        }
      } catch (err) {
        if (!selectedModel) {
          const msg =
            err instanceof Error ? err.message : "Cannot connect to server";
          setIsLoading(false);
          setError(msg);
          return;
        }
      }

      setModel(selectedModel);

      if (!selectedModel) {
        setIsLoading(false);
        setError(
          "No model configured. Set a default model in Browse Models or extension preferences.",
        );
        return;
      }

      await runTransform(config, selectedModel, text, systemPrompt);
    })();
  }, []);

  const runTransform = async (
    config: ProviderConfig,
    modelId: string,
    text: string,
    sysPrompt: string,
  ) => {
    const messages: ChatMessage[] = [
      { role: "system", content: sysPrompt },
      { role: "user", content: text },
    ];

    try {
      const stream = await sendChatStream(config, {
        model: modelId,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });

      let fullResponse = "";
      for await (const token of parseSSEStream(stream)) {
        fullResponse += token;
        setResponse(fullResponse);
      }

      // Auto-paste if preference is enabled
      const prefs = getPreferenceValues<Preferences>();
      if (prefs.autoPasteResult) {
        try {
          await Clipboard.paste(fullResponse);
        } catch {
          await Clipboard.copy(fullResponse);
          await showToast({
            style: Toast.Style.Success,
            title: "Copied to Clipboard",
            message: "Could not auto-paste, copied instead",
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
        primaryAction: {
          title: "Open Settings",
          onAction: () => openExtensionPreferences(),
        },
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !response) {
    return (
      <Detail
        markdown={`## ${title}\n\n**Error:** ${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown =
    isLoading && !response
      ? `## ${title}\n\n*Processing...*\n\n---\n\n**Input:**\n\n${inputText}`
      : `## ${title}\n\n${response}${isLoading ? "\n\n*Generating...*" : ""}`;

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Result"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              if (response) {
                await Clipboard.copy(response);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied",
                });
              }
            }}
          />
          <Action
            title="Paste Result"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              if (response) {
                try {
                  await Clipboard.paste(response);
                } catch {
                  await Clipboard.copy(response);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied to Clipboard",
                    message: "Could not paste, copied instead",
                  });
                }
              }
            }}
          />
          <Action
            title="Open in Chat"
            icon={Icon.Message}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "chat",
                  type: LaunchType.UserInitiated,
                  context: {
                    initialQuestion: inputText,
                    initialResponse: response,
                    model,
                  },
                });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not open Chat",
                });
              }
            }}
          />
          <Action
            title="Copy Original"
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={async () => {
              if (inputText) {
                await Clipboard.copy(inputText);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Original Copied",
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function TextTransformCommand(props: TextTransformProps) {
  const { needsOnboarding, isChecking, markDone } = useOnboarding();

  if (isChecking) {
    return <Detail isLoading markdown="" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm onComplete={markDone} />;
  }

  return <TransformView {...props} />;
}
