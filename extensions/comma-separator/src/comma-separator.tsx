import React, { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";

const PREDEFINED_SEPARATORS = [
  { id: ",", name: "Comma (,)", value: "," },
  { id: "|", name: "Pipe (|)", value: "|" },
  { id: "_", name: "Underscore (_)", value: "_" },
  { id: ";", name: "Semicolon (;)", value: ";" },
  { id: "\\t", name: "Tab", value: "\t" },
  { id: " ", name: "Space", value: " " },
  { id: "custom", name: "Custom", value: "custom" },
];

const QUOTE_TYPES = [
  { id: "none", name: "None", value: "none" },
  { id: "single", name: "Single (')", value: "single" },
  { id: "double", name: 'Double (")', value: "double" },
];

export default function Command() {
  const [inputText, setInputText] = useState<string>("");
  const [separator, setSeparator] = useState<string>(",");
  const [customSeparator, setCustomSeparator] = useState<string>("");
  const [quoteType, setQuoteType] = useState<string>("none");
  const [result, setResult] = useState<string>("");

  function processText() {
    if (!inputText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No input text",
        message: "Please enter some text to process",
      });
      return;
    }

    // Split by whitespace and newlines, filter out empty strings
    const elements = inputText.split(/\s+/).filter((element) => element.trim() !== "");

    if (elements.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No valid elements",
        message: "Please enter text with valid elements",
      });
      return;
    }

    // Determine the actual separator to use
    const actualSeparator = separator === "custom" ? customSeparator : separator;

    if (separator === "custom" && !customSeparator.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Custom separator required",
        message: "Please enter a custom separator",
      });
      return;
    }

    // Apply quotes if needed
    let processedElements = elements;
    if (quoteType === "single") {
      processedElements = elements.map((element) => `'${element}'`);
    } else if (quoteType === "double") {
      processedElements = elements.map((element) => `"${element}"`);
    }

    // Join with the selected separator
    const processedResult = processedElements.join(actualSeparator);
    setResult(processedResult);

    // Copy to clipboard
    Clipboard.copy(processedResult);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: `Processed ${elements.length} elements`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Convert Text" onAction={processText} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="inputText"
        title="Input Text"
        placeholder="Enter text with whitespaces or line breaks here.."
        value={inputText}
        onChange={setInputText}
      />

      <Form.Dropdown id="separator" title="Separator" value={separator} onChange={setSeparator}>
        {PREDEFINED_SEPARATORS.map((sep) => (
          <Form.Dropdown.Item key={sep.id} value={sep.value} title={sep.name} />
        ))}
      </Form.Dropdown>

      {separator === "custom" && (
        <Form.TextField
          id="customSeparator"
          title="Custom Separator"
          placeholder="e.g., :: or | or ->"
          value={customSeparator}
          onChange={setCustomSeparator}
        />
      )}

      <Form.Dropdown id="quoteType" title="Quote Type" value={quoteType} onChange={setQuoteType}>
        {QUOTE_TYPES.map((quote) => (
          <Form.Dropdown.Item key={quote.id} value={quote.value} title={quote.name} />
        ))}
      </Form.Dropdown>

      {result && <Form.Description title="Result" text={result} />}
    </Form>
  );
}
