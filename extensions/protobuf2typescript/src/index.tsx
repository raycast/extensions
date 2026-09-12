import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";

type Values = {
  protocol_buffer: string;
  definition_typescript: string;
};

export default function Command() {
  const [dts, setDts] = useState<string>();

  function handleSubmit(values: Values) {
    try {
      parseProtobuf(values.protocol_buffer);
      showToast({ title: "Convert success!" });
    } catch (e) {
      console.error("PB2TS Error>>", JSON.stringify(e));
      showToast({
        style: Toast.Style.Failure,
        title: "Convert failure!",
      });
    }
  }

  const TYPE_MAPPING: Record<string, string> = {
    double: "number",
    float: "number",
    int32: "number",
    int64: "number",
    uint32: "number",
    uint64: "number",
    sint32: "number",
    sint64: "number",
    fixed32: "number",
    fixed64: "number",
    sfixed32: "number",
    sfixed64: "number",
    bool: "boolean",
    string: "string",
    bytes: "string",
  };

  function protoToTsType(type: string) {
    if (TYPE_MAPPING[type]) {
      return TYPE_MAPPING[type];
    }
    return type;
  }

  function parseProtobuf(protobuf: string) {
    let parsed = "";

    for (const line of protobuf.split("\n")) {
      parsed += parseProtobufLine(line);
      parsed += "\n";
    }

    setDts(parsed || "");
  }

  function parseProtobufLine(line: string) {
    if (!line) {
      return "";
    }

    const indent = line.length - line.trimLeft().length;
    const indentChar = line[0];

    const tokens = line.trim().split(" ").filter(Boolean);

    let isRepeated = false;
    // debugger;
    switch (tokens[0]) {
      case "//":
        return line;
      case "}":
        return "}";
      case "message":
        return "interface " + tokens[1] + (tokens?.[2] === "{}" ? " {}" : " {");
      case "repeated":
        isRepeated = true;
        tokens.shift();
    }

    return `${indentChar.repeat(indent)}${tokens[1]}: ${protoToTsType(tokens[0])}${isRepeated ? "[]" : ""};`;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert Protocol Buffers to TypeScript definition files." />
      <Form.TextArea id="protocol_buffer" title="Protocol Buffer" placeholder="Paste Protocol Buffer code here" />
      <Form.TextArea
        id="definition_typescript"
        title="Definition Typescript"
        placeholder="Command + Enter to view result..."
        value={dts}
      />
    </Form>
  );
}
