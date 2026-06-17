import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useState } from "react";

function convertMarkdownTableToExcel(markdown: string): Promise<string> {
  const lines = markdown.trim().split("\n");
  const tableData: string[][] = lines
    .filter((line) => !/^\s*[-|]+\s*$/.test(line)) // Skip separator lines
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim())
    );

  const result = tableData
    .filter((row) => row.some((cell) => !/^[-\s]+$/.test(cell))) // Filter out rows with only dashes and spaces
    .map((row) => row.join("\t"))
    .join("\n");

  return Promise.resolve(result);
}

export default function MD2Excel() {
  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    try {
      const plain = await convertMarkdownTableToExcel(input);
      await Clipboard.copy(plain);
      await showHUD("Converted to Plain and copied to clipboard");
      await popToRoot();
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, "Failed to convert and copy Plain", "See console for more details");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Convert to Plain and Copy to Clipboard" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Markdown Table"
        placeholder="Paste your Markdown table here"
        onChange={setInput}
      />
    </Form>
  );
}
