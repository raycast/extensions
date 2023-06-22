import { Form } from "@raycast/api";
import { isEmpty } from "../utils/common-utils";
import { Dispatch, SetStateAction } from "react";

export function BaseConvertersAdvanceView(props: {
  bases: { title: string; value: string }[];
  output: string;
  inputUseState: [string, Dispatch<SetStateAction<string>>];
  fromBaseUseState: [string, Dispatch<SetStateAction<string>>];
  toBaseUseState: [string, Dispatch<SetStateAction<string>>];
}) {
  const { bases, output } = props;
  const [input, setInput] = props.inputUseState;
  const [fromBase, setFromBase] = props.fromBaseUseState;
  const [toBase, setToBase] = props.toBaseUseState;
  return (
    <>
      <Form.Dropdown id={"fromBase"} title={"From Base"} value={fromBase} onChange={setFromBase}>
        {bases.map((value) => {
          return <Form.DropdownItem key={"fromBase" + value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id={"toBase"} title={"To Base"} value={toBase} onChange={setToBase}>
        {bases.map((value) => {
          return <Form.DropdownItem key={"toBase" + value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id={"input"}
        title="Input"
        value={input}
        onChange={(newValue) => {
          if (isEmpty(newValue)) return;
          setInput(newValue.trim());
        }}
      />
      <Form.Description title="Output" text={output + "\n"} />
    </>
  );
}
