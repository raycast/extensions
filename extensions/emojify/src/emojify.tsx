import { Action, ActionPanel, Form, getSelectedText, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { emojifyText } from "./api";

interface EmojifyResult {
  originalText: string;
  emojifiedText: string;
  timestamp: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EmojifyResult[]>([]);
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
            const newResult: EmojifyResult = {
              originalText: text,
              emojifiedText: response.text,
              timestamp: response.timestamp,
            };
            setResults((prevResults) => [newResult, ...prevResults]);
          } catch (error) {
            console.error("Error processing text:", error);
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to emojify text",
              message: String(error),
            });
          } finally {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error getting selected text:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to get selected text",
          message: String(error),
        });
      }
    };

    fetchSelectedText();
  }, []);

  const handleManualSubmit = async (values: { text: string }) => {
    if (!values.text.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No text entered",
        message: "Please enter some text to emojify",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await emojifyText(values.text);
      const newResult: EmojifyResult = {
        originalText: values.text,
        emojifiedText: response.text,
        timestamp: response.timestamp,
      };
      setResults((prevResults) => [newResult, ...prevResults]);
    } catch (error) {
      console.error("Error processing text:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to emojify text",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!selectedText && (
        <List.Item
          icon={Icon.Text}
          title="Enter Text Manually"
          actions={
            <ActionPanel>
              <Action.Push
                title="Enter Text"
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
            </ActionPanel>
          }
        />
      )}

      {results.map((result, index) => (
        <List.Item
          key={result.timestamp}
          icon={index === 0 ? Icon.Star : Icon.Text}
          title={
            result.emojifiedText.length > 50 ? result.emojifiedText.substring(0, 50) + "..." : result.emojifiedText
          }
          subtitle={new Date(result.timestamp).toLocaleTimeString()}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Created" text={new Date(result.timestamp).toLocaleString()} />
                  <List.Item.Detail.Metadata.TagList title="Actions">
                    <List.Item.Detail.Metadata.TagList.Item text="Copy Result" color="#FF6363" />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
              markdown={`# Emojified Text\n\n${result.emojifiedText}\n\n## Original Text\n\n${result.originalText}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Emojified Text" content={result.emojifiedText} />
              <Action.CopyToClipboard title="Copy Original Text" content={result.originalText} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
