import { Action, ActionPanel, Detail, Form, getSelectedText, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { emojifyText } from "./api";

interface EmojifyResult {
  originalText: string;
  emojifiedText: string;
  timestamp: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<EmojifyResult | null>(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const fetchSelectedText = async () => {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
        if (text && text.trim()) {
          setIsLoading(true);
          try {
            const response = await emojifyText(text);
            setCurrentResult({
              originalText: text,
              emojifiedText: response.text,
              timestamp: response.timestamp,
            });
          } catch (error) {
            console.error("Error processing text:", error);
            showFailureToast(error);
          } finally {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error getting selected text:", error);
        showFailureToast(error);
      }
    };

    fetchSelectedText();
  }, []);

  const handleManualSubmit = async (values: { text: string }) => {
    if (!values.text.trim()) {
      showFailureToast("No text entered, Please enter some text to find an emoji");
      return;
    }

    setIsLoading(true);
    try {
      const response = await emojifyText(values.text);
      setCurrentResult({
        originalText: values.text,
        emojifiedText: response.text,
        timestamp: response.timestamp,
      });
    } catch (error) {
      console.error("Error processing text:", error);
      showFailureToast(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate markdown content based on current state
  const getMarkdownContent = () => {
    if (isLoading) {
      return "# Loading...\n\nPlease wait while we emojify your text.";
    }

    if (!selectedText && !currentResult) {
      return "# Emojify Text\n\nNo text selected. Please use the 'Enter Text Manually' action to emojify some text.";
    }

    if (currentResult) {
      return `## 🤗 Emojified Text\n\n${currentResult.emojifiedText}\n\n---\n\n## 💬 Original Text\n\n${currentResult.originalText}`;
    }

    return "# Emojify Text\n\nProcessing your text...";
  };

  // Generate metadata based on current state
  const getMetadata = () => {
    if (!currentResult) return null;

    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Created" text={new Date(currentResult.timestamp).toLocaleString()} />
        <Detail.Metadata.TagList title="Actions">
          <Detail.Metadata.TagList.Item text="Copy Result" color="#FF6363" />
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
          {!selectedText && (
            <Action.Push
              icon={Icon.Text}
              title="Enter Text Manually"
              target={
                <Form
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm title="Emojify" onSubmit={handleManualSubmit} />
                    </ActionPanel>
                  }
                >
                  <Form.TextArea id="text" title="Text to Emojify" placeholder="Enter your text here..." />
                </Form>
              }
            />
          )}
          {currentResult && (
            <>
              <Action.Paste title="Replace with Emojified" content={currentResult.emojifiedText} />
              <Action.CopyToClipboard title="Copy Emojified Text" content={currentResult.emojifiedText} />
              <Action.CopyToClipboard title="Copy Original Text" content={currentResult.originalText} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
