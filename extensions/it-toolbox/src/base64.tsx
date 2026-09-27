import { Icon, Form } from "@raycast/api";
import {
  base64Decode,
  base64Encode,
  binaryDecode,
  binaryEncode,
  hexDecode,
  hexEncode,
  previewTitle,
} from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

type Mode = "base64" | "base64url" | "hex" | "binary";

export default function Command() {
  return (
    <InputForm
      inputTitle="Text or Encoded String"
      placeholder="hello world / aGVsbG8gd29ybGQ="
      extraFields={({ setValue }) => (
        <Form.Dropdown
          id="mode"
          title="Format"
          defaultValue="base64"
          storeValue
          onChange={(mode) => setValue("mode", mode)}
        >
          <Form.Dropdown.Item title="Base64" value="base64" icon={Icon.Code} />
          <Form.Dropdown.Item title="Base64 URL Safe" value="base64url" icon={Icon.Link} />
          <Form.Dropdown.Item title="Hex" value="hex" icon={Icon.Hashtag} />
          <Form.Dropdown.Item title="Binary" value="binary" icon={Icon.Hashtag} />
        </Form.Dropdown>
      )}
      compute={(values) => {
        const input = values.input ?? "";
        if (!input) return [];
        const mode = (values.mode as Mode) ?? "base64";
        const rows: ResultRow[] = [];

        try {
          const encoded =
            mode === "base64url"
              ? base64Encode(input, true)
              : mode === "base64"
                ? base64Encode(input)
                : mode === "hex"
                  ? hexEncode(input)
                  : binaryEncode(input);
          rows.push({
            id: "encoded",
            title: previewTitle(encoded),
            detail: encoded,
            subtitle: "Encoded",
            icon: Icon.ArrowRight,
            copyValue: encoded,
          });
        } catch (error) {
          rows.push({
            id: "encode-error",
            title: `Encoding failed: ${(error as Error).message}`,
            icon: Icon.CircleDisabled,
          });
        }

        try {
          const decoded =
            mode === "base64url"
              ? base64Decode(input)
              : mode === "base64"
                ? base64Decode(input)
                : mode === "hex"
                  ? hexDecode(input)
                  : binaryDecode(input);
          rows.push({
            id: "decoded",
            title: previewTitle(decoded),
            detail: decoded,
            subtitle: "Decoded",
            icon: Icon.ArrowLeft,
            copyValue: decoded,
          });
        } catch (error) {
          rows.push({
            id: "decode-error",
            title: `Decoding failed: ${(error as Error).message}`,
            icon: Icon.ExclamationMark,
          });
        }

        rows.push({
          id: "length",
          title: `${new TextEncoder().encode(input).length} bytes`,
          subtitle: "Input size (UTF-8)",
          icon: Icon.Gauge,
        });
        return rows;
      }}
    />
  );
}
