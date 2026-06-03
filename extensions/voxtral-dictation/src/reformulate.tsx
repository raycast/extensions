import {
  ActionPanel,
  Action,
  Detail,
  showHUD,
  Clipboard,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readFile, writeFile } from "fs/promises";
import {
  LAST_TRANSCRIPTION_FILE,
  REFORMULATED_FILE,
  checkMistralResponse,
  type Preferences,
} from "./shared";

const DEFAULT_SYSTEM_PROMPT =
  "You are a text reformulator. The user gives you a raw speech-to-text transcription. It may contain filler words, repetitions, grammatical errors, or unclear phrasing. Rewrite it as a clear, well-structured text. Be concise and direct. Preserve the original meaning and intent. Only output the reformulated text, nothing else. Keep the same language as the input.";

async function callReformulate(
  text: string,
  apiKey: string,
  systemPrompt: string,
): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });

  await checkMistralResponse(response);
  const result = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return result.choices[0].message.content;
}

export default function Command() {
  const [rawText, setRawText] = useState("");
  const [reformulatedText, setReformulatedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await readFile(LAST_TRANSCRIPTION_FILE, "utf-8");
        if (!raw.trim()) {
          setError("No recent transcription to reformulate");
          setIsLoading(false);
          return;
        }
        setRawText(raw);

        // Try cache first
        try {
          const cached = await readFile(REFORMULATED_FILE, "utf-8");
          setReformulatedText(cached);
          setIsLoading(false);
          return;
        } catch {
          // No cache, call API
        }

        const { apiKey, reformulatePrompt } =
          getPreferenceValues<Preferences>();
        const systemPrompt = reformulatePrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
        const result = await callReformulate(raw, apiKey, systemPrompt);
        await writeFile(REFORMULATED_FILE, result, "utf-8");
        setReformulatedText(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (error) {
    return <Detail markdown={`## Error\n\n${error}`} />;
  }

  const markdown = isLoading
    ? "Loading..."
    : `## Raw Transcription\n\n${rawText}\n\n---\n\n## Reformulated\n\n${reformulatedText}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !isLoading ? (
          <ActionPanel>
            <Action
              title="Paste Reformulated"
              onAction={async () => {
                await Clipboard.paste(reformulatedText);
                await showHUD("Reformulated version pasted!");
                await popToRoot();
              }}
            />
            <Action
              title="Paste Original"
              onAction={async () => {
                await Clipboard.paste(rawText);
                await showHUD("Original version pasted!");
                await popToRoot();
              }}
            />
            <Action
              title="Copy Reformulated"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(reformulatedText);
                await showHUD("Reformulated version copied!");
              }}
            />
            <Action
              title="Copy Original"
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(rawText);
                await showHUD("Original version copied!");
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
