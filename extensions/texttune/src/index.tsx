import { useState, useEffect, useRef, useCallback } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  getSelectedText,
  showHUD,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
  PopToRootType,
  Icon,
} from "@raycast/api";
import { rewriteText, type RewriteOptions } from "./providers";
import { TONE_LABELS } from "./tones";

interface Preferences {
  provider: string;
  apiKey: string;
  model: string;
  customApiUrl: string;
  tone: string;
}

export default function Command() {
  const [originalText, setOriginalText] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTone, setCurrentTone] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  const performRewrite = useCallback(
    async (tone?: string, sourceText?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setRewrittenText("");

      try {
        let text = sourceText ?? "";

        if (!text) {
          text = await getSelectedText();
          setOriginalText(text);
        }

        if (!text.trim()) {
          throw new Error("No text selected.");
        }

        const activeTone = tone || preferences.tone || "professional";
        setCurrentTone(activeTone);

        if (preferences.provider !== "ollama" && !preferences.apiKey) {
          throw new Error(
            "API key not configured. Press Enter to open preferences.",
          );
        }

        const options: RewriteOptions = {
          text: text.trim(),
          tone: activeTone,
          provider: preferences.provider,
          apiKey: preferences.apiKey,
          model: preferences.model,
          customApiUrl: preferences.customApiUrl,
        };

        const result = await rewriteText(options, controller.signal);
        if (!controller.signal.aborted) {
          setRewrittenText(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [preferences],
  );

  useEffect(() => {
    performRewrite();
    return () => abortRef.current?.abort();
  }, []);

  let markdown: string;
  if (error) {
    markdown = error;
  } else if (isLoading) {
    markdown = "Rewriting...";
  } else {
    markdown = rewrittenText;
  }

  return (
    <Detail
      navigationTitle="TextTune"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isLoading && !error && (
            <>
              <Action
                title="Paste to Active App"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.paste(rewrittenText);
                  await showHUD("Pasted!", {
                    popToRootType: PopToRootType.Immediate,
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={rewrittenText}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <ActionPanel.Section title="Try Different Tone">
                {Object.entries(TONE_LABELS)
                  .filter(([key]) => key !== currentTone)
                  .map(([key, label]) => (
                    <Action
                      key={key}
                      title={label}
                      icon={Icon.ArrowClockwise}
                      onAction={() => performRewrite(key, originalText)}
                    />
                  ))}
              </ActionPanel.Section>
            </>
          )}
          {error && (
            <>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => performRewrite()}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
