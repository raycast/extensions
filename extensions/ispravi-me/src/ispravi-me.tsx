import { ActionPanel, Action, Detail, Form, showToast, Toast, getSelectedText, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

interface ErrorResponse {
  suspicious: string;
  position: [number, number];
  length: number;
  suggestions?: string[];
  message?: string;
}

interface ApiResponse {
  response: {
    error?: ErrorResponse[];
  };
}

export default function Command() {
  const [text, setText] = useState("");
  const [processedText, setProcessedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [correctedText, setCorrectedText] = useState<string>("");

  useEffect(() => {
    const fetchSelectedText = async () => {
      try {
        const selectedText = await getSelectedText();
        if (selectedText && selectedText.trim()) {
          setText(selectedText);
          await analyzeText(selectedText);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
      }
    };

    fetchSelectedText();
  }, []);

  const analyzeText = async (inputText: string) => {
    try {
      const response = await axios.post<ApiResponse>("https://ispravi.me/api/ispravi", {
        text: inputText,
      });
      const errors = response.data.response.error || [];
      const highlightedText = highlightErrors(inputText, errors);
      setProcessedText(highlightedText);

      // Automatically copy corrected text to clipboard
      if (correctedText) {
        await Clipboard.copy(correctedText);
        await showToast({
          style: Toast.Style.Success,
          title: "Corrected text copied to clipboard",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to analyze text",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const highlightErrors = (original: string, errors: ErrorResponse[]) => {
    const sortedErrors = [...errors].sort((a, b) => b.position[0] - a.position[0]);

    let result = original;

    // Add error summary at the top if there are errors
    let errorSummary = "";
    if (sortedErrors.length > 0) {
      errorSummary = "### Found Errors:\n\n";
      sortedErrors.forEach((error, index) => {
        const suggestions = error.suggestions
          ? `Suggestions: ${error.suggestions.join(", ")}`
          : "No suggestions available";

        errorSummary += `${index + 1}. "${error.suspicious}" - ${suggestions}\n`;
      });
      errorSummary += "\n### Text with highlighted errors:\n\n";
    }

    // Create corrected version for clipboard
    let correctedText = original;
    [...errors]
      .sort((a, b) => a.position[0] - b.position[0])
      .forEach((error) => {
        if (error.suggestions && error.suggestions.length > 0) {
          const start = error.position[0];
          const end = start + error.length;
          correctedText = correctedText.slice(0, start) + error.suggestions[0] + correctedText.slice(end);
        }
      });

    // Store corrected text for later use
    setCorrectedText(correctedText);

    sortedErrors.forEach((error) => {
      const start = error.position[0];
      const end = start + error.length;
      const replacement = `**~~${error.suspicious}~~**`;
      result = result.slice(0, start) + replacement + result.slice(end);
    });

    return errorSummary + result;
  };

  const handleFormSubmit = async (values: { text: string }) => {
    const inputText = values.text;
    if (!inputText?.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter some text",
      });
      return;
    }

    setText(inputText);
    setIsLoading(true);
    await analyzeText(inputText);
  };

  return (
    <>
      {text ? (
        <Detail
          isLoading={isLoading}
          markdown={processedText || "Analyzing text..."}
          navigationTitle="Text Analysis"
          actions={
            <ActionPanel>
              <Action
                title="Copy Corrected Text"
                onAction={async () => {
                  await Clipboard.copy(correctedText);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Corrected text copied to clipboard",
                  });
                }}
              />
              <Action
                title="Copy Original Text"
                onAction={async () => {
                  await Clipboard.copy(text);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Original text copied to clipboard",
                  });
                }}
              />
              <Action
                title="Start New Analysis"
                onAction={() => {
                  setText("");
                  setProcessedText(null);
                  setCorrectedText("");
                  setIsLoading(false);
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Analyze Text" onSubmit={handleFormSubmit} />
            </ActionPanel>
          }
        >
          <Form.TextArea id="text" title="Text" placeholder="Enter Croatian text here" enableMarkdown={false} />
        </Form>
      )}
    </>
  );
}
