import { Action, ActionPanel, Clipboard, Detail, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "at",
  "by",
  "in",
  "of",
  "on",
  "to",
  "up",
  "as",
  "is",
  "if",
  "it",
]);

function toTitleCase(text: string): string {
  if (!text || text.length === 0) return text;
  const words = text.toLowerCase().split(/\s+/);
  const titleCased = words.map((word, index) => {
    if (index === 0 || index === words.length - 1) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    if (LOWERCASE_WORDS.has(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return titleCased.join(" ");
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
        setConvertedText(toTitleCase(text));
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

# Title Case Text

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
                message: "Text converted to Title Case",
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
                message: "Text converted to Title Case",
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
