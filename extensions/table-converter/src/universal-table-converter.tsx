import {
  Action,
  ActionPanel,
  Form,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Table2MD, ConverterOptions, ConverterMode } from "./utils/converter";
import { MarkdownTableConverter } from "./utils/markdownParser";

type Format = "markdown" | "csv" | "json" | "html" | "xls";

export default function UniversalTableConverter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [inputFormat, setInputFormat] = useState<string>("auto");
  const [targetFormat, setTargetFormat] = useState<Format>("markdown");

  // Options state
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [trimWhiteSpace, setTrimWhiteSpace] = useState(true);
  const trimBlankLines = true;

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text) {
        setInput(text);
        detectAndSetFormat(text);
      }
    });
  }, []);

  const detectAndSetFormat = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      setInputFormat("markdown");
      setTargetFormat("csv"); // Default conversion for MD input
    } else if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      setInputFormat("json");
      setTargetFormat("markdown");
    } else if (trimmed.includes("<table") || trimmed.includes("<td")) {
      setInputFormat("html");
      setTargetFormat("markdown");
    } else if (text.includes("\t")) {
      setInputFormat("xls");
      setTargetFormat("markdown");
    } else if (text.includes(",")) {
      setInputFormat("csv");
      setTargetFormat("markdown");
    } else {
      setInputFormat("smart"); // Fallback for space-separated
      setTargetFormat("markdown");
    }
  };

  useEffect(() => {
    convert();
  }, [
    input,
    inputFormat,
    targetFormat,
    firstRowHeader,
    trimWhiteSpace,
    trimBlankLines,
  ]);

  const convert = () => {
    if (!input) {
      setOutput("");
      return;
    }

    try {
      // Case 1: Input is Markdown -> Output to X
      if (inputFormat === "markdown") {
        const converter = new MarkdownTableConverter(input);
        switch (targetFormat) {
          case "csv":
            setOutput(converter.toCSV());
            break;
          case "json":
            setOutput(converter.toJSON());
            break;
          case "html":
            setOutput(converter.toHTML());
            break;
          case "xls":
            setOutput(converter.toTSV());
            break; // Excel = TSV
          case "markdown":
            setOutput(input);
            break; // No-op
        }
      }
      // Case 2: Input is X -> Output to Markdown
      else if (targetFormat === "markdown") {
        const mode = (
          inputFormat === "auto" ? "smart" : inputFormat
        ) as ConverterMode;
        const options: ConverterOptions = {
          mode: mode,
          firstRowHeader,
          trimWhiteSpace,
          trimBlankLines,
          tableWidth: "header",
        };
        const converter = new Table2MD(input, options);
        setOutput(converter.convert());
      }
      // Case 3: Input X -> Output Y (Not fully supported directly, maybe via MD?)
      // For now, we support "To Markdown" OR "From Markdown".
      // If user wants JSON -> CSV, they can do JSON -> MD -> CSV.
      // Or we can chain it implicitly.
      else {
        // Implicit chaining: Input -> MD -> Target
        const mode = (
          inputFormat === "auto" ? "smart" : inputFormat
        ) as ConverterMode;
        const options: ConverterOptions = {
          mode: mode,
          firstRowHeader,
          trimWhiteSpace,
          trimBlankLines,
          tableWidth: "header",
        };
        const mdConverter = new Table2MD(input, options);
        const md = mdConverter.convert();

        if (md && md.startsWith("|")) {
          const finalConverter = new MarkdownTableConverter(md);
          switch (targetFormat) {
            case "csv":
              setOutput(finalConverter.toCSV());
              break;
            case "json":
              setOutput(finalConverter.toJSON());
              break;
            case "html":
              setOutput(finalConverter.toHTML());
              break;
            case "xls":
              setOutput(finalConverter.toTSV());
              break;
          }
        } else {
          setOutput("Intermediate conversion failed. Check input format.");
        }
      }
    } catch (e) {
      console.error(e);
      setOutput("Error converting: " + (e as Error).message);
    }
  };

  const handleCopy = () => {
    Clipboard.copy(output);
    showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Copy Output" onAction={handleCopy} />
          <Action
            title="Paste to App"
            onAction={() => {
              Clipboard.paste(output);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Paste table data..."
        value={input}
        onChange={(val) => {
          setInput(val);
          detectAndSetFormat(val);
        }}
      />

      <Form.Separator />

      <Form.Dropdown
        id="inputFormat"
        title="Input Format"
        value={inputFormat}
        onChange={setInputFormat}
      >
        <Form.Dropdown.Item value="auto" title="Auto Detect" />
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="html" title="HTML" />
        <Form.Dropdown.Item value="json" title="JSON" />
        <Form.Dropdown.Item value="csv" title="CSV" />
        <Form.Dropdown.Item value="xls" title="Excel (Tab)" />
        <Form.Dropdown.Item value="smart" title="Smart Text" />
      </Form.Dropdown>

      <Form.Dropdown
        id="targetFormat"
        title="Target Format"
        value={targetFormat}
        onChange={(val) => setTargetFormat(val as Format)}
      >
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="csv" title="CSV" />
        <Form.Dropdown.Item value="json" title="JSON" />
        <Form.Dropdown.Item value="html" title="HTML" />
        <Form.Dropdown.Item value="xls" title="Excel (Tab)" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox
        id="header"
        label="First row is header"
        value={firstRowHeader}
        onChange={setFirstRowHeader}
      />
      <Form.Checkbox
        id="trim"
        label="Trim whitespace"
        value={trimWhiteSpace}
        onChange={setTrimWhiteSpace}
      />

      <Form.Separator />

      <Form.TextArea
        id="output"
        title="Output"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
