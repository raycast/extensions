import {
  Detail,
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  Clipboard,
  getPreferenceValues,
  LocalStorage,
  useNavigation,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getProviderConfig, fetchModels, sendChatStream } from "./lib/api";
import { parseSSEStream } from "./lib/streaming";
import { getInputText } from "./lib/text-input";
import type { ChatMessage, ProviderConfig } from "./lib/types";
import { useOnboarding } from "./lib/use-onboarding";
import { OnboardingForm } from "./onboarding-form";

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Russian",
  "Dutch",
  "Swedish",
  "Polish",
  "Turkish",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Ukrainian",
];

function TranslateResultView({
  inputText,
  sourceLanguage,
  targetLanguage,
  config,
  model,
}: {
  inputText: string;
  sourceLanguage: string;
  targetLanguage: string;
  config: ProviderConfig;
  model: string;
}) {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    (async () => {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `You are a professional translator. Translate the provided text from ${sourceLanguage} to ${targetLanguage}. Preserve the original formatting, tone, and meaning. Output only the translation with no explanations or commentary.`,
        },
        { role: "user", content: inputText },
      ];

      try {
        const stream = await sendChatStream(config, {
          model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        });

        let fullResponse = "";
        for await (const token of parseSSEStream(stream)) {
          fullResponse += token;
          setResponse(fullResponse);
        }

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
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        await showToast({
          style: Toast.Style.Failure,
          title: "Translation Error",
          message: errorMessage,
          primaryAction: {
            title: "Open Settings",
            onAction: () => openExtensionPreferences(),
          },
        });
        setResponse(`**Error:** ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const markdown =
    isLoading && !response
      ? `## Translate: ${sourceLanguage} → ${targetLanguage}\n\n*Translating...*\n\n---\n\n**Original:**\n\n${inputText}`
      : `## Translate: ${sourceLanguage} → ${targetLanguage}\n\n${response}${isLoading ? "\n\n*Translating...*" : ""}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Translation"
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
            title="Paste Translation"
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
            title="Copy Original"
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={async () => {
              await Clipboard.copy(inputText);
              await showToast({
                style: Toast.Style.Success,
                title: "Original Copied",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function TranslateForm() {
  const { push } = useNavigation();
  const [inputText, setInputText] = useState("");
  const [isLoadingInput, setIsLoadingInput] = useState(true);
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [model, setModel] = useState("");

  useEffect(() => {
    (async () => {
      const providerConfig = await getProviderConfig();
      setConfig(providerConfig);

      let selectedModel = providerConfig.defaultModel;
      try {
        const storedDefault =
          await LocalStorage.getItem<string>("default_model");
        if (storedDefault) {
          selectedModel = storedDefault;
        } else if (!selectedModel) {
          const modelList = await fetchModels(providerConfig);
          selectedModel = modelList[0]?.id || "";
        }
      } catch {
        // Use whatever model we have
      }
      setModel(selectedModel);

      try {
        const text = await getInputText();
        setInputText(text);
      } catch {
        // User will see empty text area and can paste manually
      }
      setIsLoadingInput(false);
    })();
  }, []);

  if (isLoadingInput) {
    return <Detail isLoading markdown="" />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Translate"
            icon={Icon.Globe}
            onSubmit={(values: {
              sourceLanguage: string;
              targetLanguage: string;
              text: string;
            }) => {
              const text = values.text.trim();
              if (!text) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "No text to translate",
                });
                return;
              }
              if (!config) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Not connected",
                });
                return;
              }
              if (values.sourceLanguage === values.targetLanguage) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Same Language",
                  message: "Source and target languages must be different",
                });
                return;
              }
              push(
                <TranslateResultView
                  inputText={text}
                  sourceLanguage={values.sourceLanguage}
                  targetLanguage={values.targetLanguage}
                  config={config}
                  model={model}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="sourceLanguage" title="From" defaultValue="English">
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang} value={lang} title={lang} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="targetLanguage" title="To" defaultValue="Spanish">
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang} value={lang} title={lang} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Text to translate..."
        defaultValue={inputText}
      />
    </Form>
  );
}

export default function Translate() {
  const { needsOnboarding, isChecking, markDone } = useOnboarding();

  if (isChecking) {
    return <Detail isLoading markdown="" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm onComplete={markDone} />;
  }

  return <TranslateForm />;
}
