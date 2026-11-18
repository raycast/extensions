import { Action, ActionPanel, Form, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useInput } from "./hooks/use-input";
import { Base64Variant, decodeBase64, encodeBase64 } from "./lib/base64";

export default function Command(props: LaunchProps<{ arguments: { text?: string; operation?: string } }>) {
  const { value, setValue, isLoading } = useInput(props.arguments.text ?? props.fallbackText);
  const [mode, setMode] = useState(props.arguments.operation === "decode" ? "decode" : "encode");
  const [variant, setVariant] = useState<Base64Variant>("base64");
  let result = "";
  let error: string | undefined;
  try {
    result = mode === "encode" ? encodeBase64(value, variant) : decodeBase64(value, variant);
  } catch (cause) {
    error = (cause as Error).message;
  }

  return (
    <Form
      navigationTitle="Base64 Encode / Decode"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {error ? (
            <Action
              title="Check Your Input"
              icon={Icon.Warning}
              onAction={() => showToast({ style: Toast.Style.Failure, title: "Unable to Decode", message: error })}
            />
          ) : (
            <>
              <Action.CopyToClipboard title="Copy Result" content={result} />
              <Action.Paste title="Paste Result" content={result} />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Operation" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="encode" title="Encode: Text → Base64" />
        <Form.Dropdown.Item value="decode" title="Decode: Base64 → Text" />
      </Form.Dropdown>
      <Form.Dropdown id="variant" title="Format" value={variant} onChange={(next) => setVariant(next as Base64Variant)}>
        <Form.Dropdown.Item value="base64" title="Standard Base64" />
        <Form.Dropdown.Item value="base64url" title="Base64URL" />
      </Form.Dropdown>
      <Form.TextArea id="text" title="Input" value={value} onChange={setValue} />
      {error ? (
        <Form.Description title="Error" text={error} />
      ) : (
        <Form.Description title="Result" text={result || "(empty string)"} />
      )}
    </Form>
  );
}
