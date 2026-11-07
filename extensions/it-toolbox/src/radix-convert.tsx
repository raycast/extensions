import { Icon, Form } from "@raycast/api";
import { radixTable } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="Value"
      placeholder="255 / ff / 11111111 / 0b1010"
      extraFields={({ setValue }) => (
        <Form.Dropdown id="from" title="Input Base" defaultValue="10" storeValue onChange={(v) => setValue("from", v)}>
          <Form.Dropdown.Item title="Binary (2)" value="2" />
          <Form.Dropdown.Item title="Octal (8)" value="8" />
          <Form.Dropdown.Item title="Decimal (10)" value="10" />
          <Form.Dropdown.Item title="Hexadecimal (16)" value="16" />
          <Form.Dropdown.Item title="Base36 (36)" value="36" />
        </Form.Dropdown>
      )}
      compute={(values) => {
        const input = (values.input ?? "").trim();
        if (!input) return [];
        const from = Number(values.from ?? 10);
        try {
          return radixTable(input, from).map<ResultRow>((item) => ({
            id: String(item.radix),
            title: item.value,
            subtitle: item.label,
            icon: Icon.Number00,
            copyValue: item.value,
          }));
        } catch (error) {
          return [
            {
              id: "error",
              title: "Conversion failed",
              detail: (error as Error).message,
              icon: Icon.CircleDisabled,
              copyValue: (error as Error).message,
            },
          ];
        }
      }}
    />
  );
}
