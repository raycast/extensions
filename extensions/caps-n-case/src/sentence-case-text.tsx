import { Action, ActionPanel, Clipboard, Detail, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

function toSentenceCase(text: string): string {
  if (!text || text.length === 0) return text;
  // Convert to lowercase first
  const lowercased = text.toLowerCase();

  // Capitalize first letter of the entire text
  let result = lowercased.charAt(0).toUpperCase() + lowercased.slice(1);

  // Capitalize first letter after sentence-ending punctuation (. ! ?)
  // followed by one or more spaces
  result = result.replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
    return punctuation + letter.toUpperCase();
  });

  return result;
}

export default function Command() {
  const [originalText, setOriginalText] = useState<string>("");
  const [convertedText, setConvertedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchText() {
      try {
        let text = "";
        try {
          text = await getSelectedText();
        } catch {
          const clipboardText = await Clipboard.readText();
          text = clipboardText || "";
        }

        if (!text || text.trim().length === 0) {
          setError("No text found. Please select text or copy it to your clipboard.");
          setIsLoading(false);
          return;
        }

        setOriginalText(text);
        setConvertedText(toSentenceCase(text));
        setIsLoading(false);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
        setIsLoading(false);
      }
    }

    fetchText();
  }, []);

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  const markdown = `# Original Text

${originalText}

---

# Sentence case text

${convertedText}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={convertedText}
            onCopy={() => {
              showToast({
                style: Toast.Style.Success,
                title: "Copied to clipboard",
                message: "Text converted to Sentence case",
              });
            }}
          />
          <Action.Paste
            title="Paste to Active App"
            content={convertedText}
            onPaste={() => {
              showToast({
                style: Toast.Style.Success,
                title: "Pasted",
                message: "Text converted to Sentence case",
              });
            }}
          />
          <Action.CopyToClipboard
            title="Copy Original Text"
            content={originalText}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
