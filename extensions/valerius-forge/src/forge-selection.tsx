import { useEffect, useState, useRef } from "react";
import {
  getSelectedText,
  showToast,
  Toast,
  Detail,
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { streamForge } from "./llm";
import { evaluateContent } from "./contentGate";
import { META_SYSTEM_PROMPT } from "./metaPrompt";

interface Preferences {
  provider: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export default function ForgeSelectionCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState("");
  const [isForging, setIsForging] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      let selection = "";
      try {
        selection = await getSelectedText();
      } catch {
        setError("No text selected. Select text in any app and try again.");
        setIsForging(false);
        return;
      }

      if (!selection.trim()) {
        setError("Selection is empty.");
        setIsForging(false);
        return;
      }

      const gate = evaluateContent(selection);
      if (gate.blocked) {
        setError("I cannot assist with that request.");
        setIsForging(false);
        return;
      }

      if (!prefs.apiKey) {
        setError("No API key set. Open extension preferences to configure.");
        setIsForging(false);
        return;
      }

      abortRef.current = new AbortController();

      try {
        let acc = "";
        await streamForge({
          config: {
            provider: prefs.provider as Parameters<
              typeof streamForge
            >[0]["config"]["provider"],
            apiKey: prefs.apiKey,
            model: prefs.model || "gpt-4o",
            baseUrl: prefs.baseUrl,
          },
          systemPrompt: META_SYSTEM_PROMPT,
          userPrompt: selection,
          signal: abortRef.current.signal,
          onToken: (chunk) => {
            acc += chunk;
            setOutput(acc);
          },
        });
      } catch (e: unknown) {
        if (!abortRef.current?.signal.aborted) {
          const message = e instanceof Error ? e.message : "Unknown error";
          await showToast({
            style: Toast.Style.Failure,
            title: "Forge failed",
            message,
          });
        }
      } finally {
        setIsForging(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, []);

  return (
    <Detail
      isLoading={isForging}
      markdown={
        error ? `**Error:** ${error}` : output || "*Forging selection...*"
      }
      actions={
        <ActionPanel>
          <Action title="Copy Result" onAction={() => Clipboard.copy(output)} />
        </ActionPanel>
      }
    />
  );
}
