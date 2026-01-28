import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
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

  async function parseProtobuf(protobuf: string) {
    let parsed = "";

    for (const line of protobuf.split("\n")) {
      parsed += parseProtobufLine(line);
      parsed += "\n";
    }

    await Clipboard.copy(parsed || "");
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

  try {
    const text = await Clipboard.readText();
    parseProtobuf(text || "");
    showHUD("✅ Convert success!");
  } catch (e) {
    console.error("PB2TS Error>>", e);
    showHUD("⛔️ Convert failure!");
  }
}
