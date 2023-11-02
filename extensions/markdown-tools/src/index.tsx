import { Form, ActionPanel, Action, Clipboard, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import csvToMarkdown from "csv-to-markdown-table";

interface Values {
  inputValue: string;
  delimiter: string;
  firstRowIsHeader: boolean;
}

export default function Command() {
  async function handleSubmit(values: Values) {
    await Clipboard.copy(result);

    await showHUD("Table copied to clipboard");
  }
  useEffect(() => {
    const markDown = csvToMarkdown(
      input.inputValue,
      input.delimiter == "tab" ? "\t" : input.delimiter,
      input.firstRowIsHeader
    );
    setResult(markDown);
  });
  const [result, setResult] = useState<string>("");

  const [input, setInput] = useState<Values>({
    inputValue: "",
    delimiter: "tab",
    firstRowIsHeader: true,
  });

  function pasteAsMarkdownTable(newValue: string): void {
    setInput({
      ...input,
      inputValue: newValue,
    });
  }

  function setDelimiter(delimiter: string): void {
    setInput({
      ...input,
      delimiter: delimiter,
    });
  }

  function setFirstRowIsHeader(firstRowIsHeader: boolean): void {
    setInput({
      ...input,
      firstRowIsHeader: firstRowIsHeader,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Copy to Clipboard" />
        </ActionPanel>
      }
    >
      <Form.Description text="Copy the text into the area below" />
      <Form.TextArea
        id="textarea"
        title="Text area"
        value={input?.inputValue}
        placeholder="Paste your text here."
        onChange={pasteAsMarkdownTable}
      />
      <Form.Separator />
      <Form.Checkbox
        id="checkbox"
        title="Row Header"
        label="First row is not header value"
        value={input?.firstRowIsHeader}
        onChange={setFirstRowIsHeader}
      />
      <Form.Dropdown id="dropdown" title="Delimiter" value={input.delimiter} onChange={setDelimiter}>
        <Form.Dropdown.Item value="tab" title="Tab" />
        <Form.Dropdown.Item value="," title="Comma" />
        <Form.Dropdown.Item value=";" title="Semicolon" />
        <Form.Dropdown.Item value=" " title="Space" />
      </Form.Dropdown>
      <Form.TextArea
        id="pasteArea"
        title="Text area"
        value={result}
        placeholder="Enter multi-line text"
        onChange={setResult}
      />
    </Form>
  );
}
