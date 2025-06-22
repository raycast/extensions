import { Action, ActionPanel, Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getEmojiForText } from "./api";
interface EmojiResult {
  originalText: string;
  emoji: string;
  timestamp: number;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.EmojiSelector }>) {
  const { text } = props.arguments;
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<EmojiResult | null>(null);

  // Process the input argument when component loads
  useEffect(() => {
    if (text && text.trim()) {
      handleTextSearch(text);
    }
  }, [text]);

  const handleTextSearch = async (inputText: string) => {
    if (!inputText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No text entered",
        message: "Please enter some text to find an emoji",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await getEmojiForText(inputText);
      setCurrentResult({
        originalText: inputText,
        emoji: response.text,
        timestamp: response.timestamp,
      });
    } catch (error) {
      console.error("Error finding emoji:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to find emoji",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate markdown content based on current state
  const getMarkdownContent = () => {
    if (isLoading) {
      return "# Loading...\n\nPlease wait while we find the perfect emoji.";
    }

    if (!currentResult) {
      return "# Emoji Selector\n\nEnter text to find the most relevant emoji.";
    }

    return `# Emoji Result\n\n## ${currentResult.emoji}\n\n---\n\n## 💬 Original Text\n\n${currentResult.originalText}`;
  };

  // Generate metadata based on current state
  const getMetadata = () => {
    if (!currentResult) return null;

    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Created" text={new Date(currentResult.timestamp).toLocaleString()} />
        <Detail.Metadata.TagList title="Actions">
          <Detail.Metadata.TagList.Item text="Copy Emoji" color="#FF6363" />
        </Detail.Metadata.TagList>
      </Detail.Metadata>
    );
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdownContent()}
      metadata={getMetadata()}
      actions={
        <ActionPanel>
          {currentResult && (
            <>
              <Action.CopyToClipboard title="Copy Emoji" content={currentResult.emoji} />
              <Action.CopyToClipboard title="Copy Original Text" content={currentResult.originalText} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
