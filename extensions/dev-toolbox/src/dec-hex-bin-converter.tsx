import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";

type BaseType = "dec" | "hex" | "bin";

export default function EngineeringConverters() {
  const [input, setInput] = useState("");
  const [fromBase, setFromBase] = useState<BaseType>("dec");
  const [result, setResult] = useState("");

  const convertNumber = () => {
    try {
      const sanitizedInput = input.replace(/0x|0b/gi, "");
      let decimal = NaN;

      switch (fromBase) {
        case "dec":
          decimal = parseInt(sanitizedInput, 10);
          break;
        case "hex":
          decimal = parseInt(sanitizedInput, 16);
          break;
        case "bin":
          decimal = parseInt(sanitizedInput, 2);
          break;
      }

      if (isNaN(decimal)) throw new Error("Invalid input");

      const conversions = {
        dec: decimal.toString(10),
        hex: decimal.toString(16).toUpperCase(),
        bin: decimal.toString(2),
      };

      setResult(
        `Decimal: ${conversions.dec}\n` + `Hexadecimal: 0x${conversions.hex}\n` + `Binary: 0b${conversions.bin}`,
      );
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Invalid input" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={convertNumber} />
        </ActionPanel>
      }
    >
      <Form.TextField id="input" title="Input Value" value={input} onChange={setInput} />
      <Form.Dropdown
        id="fromBase"
        title="From Base"
        value={fromBase}
        onChange={(value) => setFromBase(value as BaseType)}
      >
        <Form.Dropdown.Item value="dec" title="Decimal" />
        <Form.Dropdown.Item value="hex" title="Hexadecimal" />
        <Form.Dropdown.Item value="bin" title="Binary" />
      </Form.Dropdown>

      {result && <Form.Description title="Conversion Results" text={result} />}
    </Form>
  );
}
