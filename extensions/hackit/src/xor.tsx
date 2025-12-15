import { ActionPanel, Action, Form, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { parseInput, performXor, formatOutput, InputType, OutputType } from "./utils/xor";

export default function Command() {
  const [inputA, setInputA] = useState("");
  const [typeA, setTypeA] = useState<string>(InputType.Auto);

  const [inputB, setInputB] = useState("");
  const [typeB, setTypeB] = useState<string>(InputType.Auto);

  const [outputType, setOutputType] = useState<string>(OutputType.Hex);
  const [result, setResult] = useState("");

  useEffect(() => {
    Clipboard.readText().then((clip) => {
      if (clip) {
        setInputA(clip);
      }
    });
  }, []);

  useEffect(() => {
    if (!inputA || !inputB) {
      setResult("");
      return;
    }

    const bufA = parseInput(inputA, typeA as InputType);
    const bufB = parseInput(inputB, typeB as InputType);

    if (bufA.length > 0 && bufB.length > 0) {
      const xorRes = performXor(bufA, bufB);
      setResult(formatOutput(xorRes, outputType as OutputType));
    } else {
      setResult("Invalid input");
    }
  }, [inputA, typeA, inputB, typeB, outputType]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={result} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="inputA"
        title="A"
        placeholder="Enter data (auto-filled from clipboard)..."
        value={inputA}
        onChange={setInputA}
      />
      <Form.Dropdown id="typeA" title="Type" value={typeA} onChange={setTypeA}>
        <Form.Dropdown.Item value={InputType.Auto} title="Auto" />
        <Form.Dropdown.Item value={InputType.ASCII} title="ASCII" />
        <Form.Dropdown.Item value={InputType.Hex} title="Hex" />
        <Form.Dropdown.Item value={InputType.Decimal} title="Decimal" />
        <Form.Dropdown.Item value={InputType.Binary} title="Binary" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="inputB"
        title="B"
        placeholder="Enter key/second input..."
        value={inputB}
        onChange={setInputB}
        autoFocus={true}
      />
      <Form.Dropdown id="typeB" title="Type" value={typeB} onChange={setTypeB}>
        <Form.Dropdown.Item value={InputType.Auto} title="Auto" />
        <Form.Dropdown.Item value={InputType.ASCII} title="ASCII" />
        <Form.Dropdown.Item value={InputType.Hex} title="Hex" />
        <Form.Dropdown.Item value={InputType.Decimal} title="Decimal" />
        <Form.Dropdown.Item value={InputType.Binary} title="Binary" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="outputType" title="Output Format" value={outputType} onChange={setOutputType}>
        <Form.Dropdown.Item value={OutputType.Hex} title="Hex" />
        <Form.Dropdown.Item value={OutputType.ASCII} title="ASCII" />
        <Form.Dropdown.Item value={OutputType.Decimal} title="Decimal" />
        <Form.Dropdown.Item value={OutputType.Binary} title="Binary" />
      </Form.Dropdown>

      <Form.Description title="Result" text={result || ""} />
    </Form>
  );
}
