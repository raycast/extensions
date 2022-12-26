import { Form, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";

const encode = (svg: string, externalQuotes: string): string => {
  const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
  let quote: string;
  let output = svg
    .replace(/\s{2,}/g, " ")
    .replace(/\s+$/, "")
    .replace(/>\s+</g, "><");

  if (!output.includes("http://www.w3.org/2000/svg")) {
    output = output.replace(/<svg/g, `<svg xmlns="http://www.w3.org/2000/svg"`);
  }

  if (externalQuotes === "single") {
    output = output.replace(/'/g, '"');
    quote = "'";
  } else {
    output = output.replace(/"/g, "'");
    quote = '"';
  }

  output = output.replace(symbols, encodeURIComponent);
  output = `url(${quote}data:image/svg+xml,${output}${quote})`;

  return output;
};

export default function HTMLEncoderDecoderCommand() {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [externalQuotes, setExternalQuotes] = useState<string>("double");

  useEffect(() => {
    if (input === "") {
      setOutput("");
    } else {
      setOutput(encode(input, externalQuotes));
    }
  }, [input, externalQuotes]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" value={input} onChange={setInput} />

      <Form.TextArea id="output" title="Output" value={output} onChange={() => null} />

      <Form.Separator />

      <Form.Dropdown id="mode" title="External Quotes" value={externalQuotes} onChange={setExternalQuotes}>
        <Form.Dropdown.Item value="single" title="Single" />
        <Form.Dropdown.Item value="double" title="Double" />
      </Form.Dropdown>
    </Form>
  );
}
