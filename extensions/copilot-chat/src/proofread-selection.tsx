import {
  Action,
  ActionPanel,
  Detail,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuth, AuthGate, streamChat } from "./shared";

export default function ProofreadSelection() {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { ghoToken, deviceFlow } = useAuth();

  useEffect(() => {
    if (!ghoToken) return;

    let cancelled = false;
    const controller = new AbortController();

    const processSelection = async () => {
      try {
        const selectedText = await getSelectedText();
        if (!selectedText || selectedText.trim() === "") {
          setMarkdown(
            "**No text selected.** Please highlight some text in an application first, then run this command.",
          );
          setIsLoading(false);
          return;
        }

        const preferences = getPreferenceValues<{ customPrompt: string }>();
        const fullPrompt = `${preferences.customPrompt}\n\n\`\`\`\n${selectedText}\n\`\`\``;

        streamChat(
          ghoToken,
          fullPrompt,
          (content) => {
            if (!cancelled) setMarkdown(content);
          },
          () => {
            if (!cancelled) setIsLoading(false);
          },
          (error) => {
            if (!cancelled) {
              setMarkdown(
                `**Error**: ${error instanceof Error ? error.message : String(error)}`,
              );
              setIsLoading(false);
            }
          },
          controller.signal,
        );
      } catch (error) {
        if (!cancelled) {
          setMarkdown(
            `**Error**: ${error instanceof Error ? error.message : String(error)}`,
          );
          setIsLoading(false);
        }
      }
    };

    processSelection();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ghoToken]);

  return (
    <AuthGate ghoToken={ghoToken} deviceFlow={deviceFlow}>
      <Detail
        isLoading={isLoading}
        markdown={markdown || (isLoading ? "⚡️ Proofreading selection..." : "")}
        actions={
          <ActionPanel>
            {markdown && (
              <Action.CopyToClipboard title="Copy Result" content={markdown} />
            )}
          </ActionPanel>
        }
      />
    </AuthGate>
  );
}
