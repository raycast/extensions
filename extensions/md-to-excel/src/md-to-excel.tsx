import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useState } from "react";

function isExcelFormat(input: string): boolean {
  return !/^\|(.+\|)+$/m.test(input); // 如果输入不是Markdown表格，则将其视为Excel表格
}

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

function createMarkdownTable(tableData: string[][]): string {
  const separator = tableData[0].map(() => "---").join("|");
  const result = tableData
    .map((row, index) => {
      const markdownRow = `|${row.join("|")}|`;
      return index === 0 ? `${markdownRow}\n|${separator}|` : markdownRow;
    })
    .join("\n");

  return result;
}

function convertExcelToMarkdown(excel: string): Promise<string> {
  const lines = excel.trim().split("\n");
  const tableData = lines.map((line) => line.split("\t").map((cell) => cell.trim()));

  const result = createMarkdownTable(tableData);

  return Promise.resolve(result);
}

export default function MD2Excel() {
  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    try {
      const result = isExcelFormat(input)
        ? await convertExcelToMarkdown(input)
        : await convertMarkdownTableToExcel(input);

      await Clipboard.copy(result);
      await showHUD("Converted and copied to clipboard");
      await popToRoot();
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, "Failed to convert and copy", "See console for more details");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Convert and Copy to Clipboard" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Table"
        placeholder="Paste your Markdown table or Excel data here"
        onChange={setInput}
      />
    </Form>
  );
}
