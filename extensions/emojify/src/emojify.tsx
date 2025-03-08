import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getSelectedText,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
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
  const { push } = useNavigation();

  useEffect(() => {
    const fetchSelectedText = async () => {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
        if (text) {
          await processText(text);
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

  const processText = async (text: string) => {
    if (!text.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Please select some text to emojify",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await emojifyText(text);
      const newResult: EmojifyResult = {
        originalText: text,
        emojifiedText: response.text,
        timestamp: response.timestamp,
      };

      setResults((prevResults) => [newResult, ...prevResults]);
      push(<ResultDetail result={newResult} />);
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

  const handleManualSubmit = async (values: { text: string }) => {
    await processText(values.text);
  };

  return (
    <List isLoading={isLoading}>
      {selectedText ? null : (
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
          accessories={[{ text: new Date(result.timestamp).toLocaleDateString() }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ResultDetail result={result} />} />
              <Action.CopyToClipboard title="Copy Emojified Text" content={result.emojifiedText} />
              <Action.CopyToClipboard title="Copy Original Text" content={result.originalText} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ResultDetail({ result }: { result: EmojifyResult }) {
  return (
    <Detail
      markdown={`# Emojified Text\n\n${result.emojifiedText}\n\n## Original Text\n\n${result.originalText}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={new Date(result.timestamp).toLocaleString()} />
          <Detail.Metadata.TagList title="Actions">
            <Detail.Metadata.TagList.Item text="Copy Result" color="#FF6363" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Emojified Text" content={result.emojifiedText} />
          <Action.CopyToClipboard title="Copy Original Text" content={result.originalText} />
        </ActionPanel>
      }
    />
  );
}
